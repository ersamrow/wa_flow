import './environment';
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { CommonModule } from './common/common.module';
import { DatabaseService } from './common/database.service';
import { MysqlSessionStore } from './common/session.store';
import { ApiExceptionFilter } from './common/exception.filter';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ProvidersModule } from './providers/providers.module';
import type { AppRequest } from './common/request';

@Module({ imports: [CommonModule, ProvidersModule, AuthModule, WorkspaceModule] })
class AppModule {}

export async function bootstrap() {
  const secret=process.env.NODE_SESSION_SECRET||process.env.APP_KEY;
  if(!secret||secret.length<32)throw new Error('Configure NODE_SESSION_SECRET (at least 32 characters) and preserve APP_KEY.');
  const app=await NestFactory.create(AppModule,{rawBody:true});
  const express=app.getHttpAdapter().getInstance();
  express.disable('x-powered-by');
  if(process.env.TRUST_PROXY==='true')express.set('trust proxy','loopback');
  app.use(helmet());
  // Nest captures the raw bytes for provider HMAC verification before JSON parsing.
  app.use(json({limit:'1mb',verify:(req:any,_res,buffer)=>{req.rawBody=Buffer.from(buffer);}}));
  app.use(urlencoded({extended:false,limit:'1mb'}));
  app.use(session({name:'waflow.sid',secret,resave:false,saveUninitialized:false,store:new MysqlSessionStore(app.get(DatabaseService).db),cookie:{httpOnly:true,sameSite:'lax',secure:process.env.SESSION_SECURE_COOKIE==='true',maxAge:86400000}}));
  app.use('/api/v1',(req:AppRequest,res:any,next:any)=>{
    res.setHeader('Cache-Control','no-store');
    if(['GET','HEAD','OPTIONS'].includes(req.method)||req.path.startsWith('/webhooks/'))return next();
    const token=req.get('X-CSRF-TOKEN')||'',expected=req.session?.csrf||'';
    const origin=req.get('Origin');
    let originAllowed=true;
    if(origin){try{originAllowed=new URL(origin).origin===new URL(process.env.APP_URL||'http://localhost:3000').origin;}catch{originAllowed=false;}}
    const tokenBytes=Buffer.from(token),expectedBytes=Buffer.from(expected);
    if(!originAllowed||!expected||tokenBytes.length!==expectedBytes.length||!timingSafeEqual(tokenBytes,expectedBytes))return res.status(419).json({message:'Your session expired. Refresh the page and try again.'});
    next();
  });
  const limit=(max:number)=>rateLimit({windowMs:60000,max,standardHeaders:true,legacyHeaders:false,message:{message:'Too many requests. Please try again shortly.'}});
  app.use('/api/v1/auth',limit(10));
  app.use('/api/v1/integrations/whatsapp/signup',limit(10));
  app.use('/api/v1/integrations/ai/test',limit(5));
  app.use('/api/v1/billing/subscribe',limit(5));
  app.use('/api/v1/billing',limit(120));
  app.use('/api/v1',limit(600));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT||4000),process.env.API_HOST||'127.0.0.1');
  return app;
}
if(require.main===module)void bootstrap().catch(()=>{console.error('API startup failed. Check database, APP_KEY, and session configuration.');process.exitCode=1;});
