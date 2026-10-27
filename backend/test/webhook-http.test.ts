import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Test } from '@nestjs/testing';
import request from 'supertest';

test('native webhook controller acknowledges signed raw payload with HTTP 200',{skip:process.env.RUN_API_SMOKE!=='true'},async()=>{
  const {WebhooksController}=require('../dist/providers/providers.controller');
  const {ProviderService}=require('../dist/providers/provider.service');
  const old=process.env.WHATSAPP_APP_SECRET;process.env.WHATSAPP_APP_SECRET='test-only-webhook-secret';
  const module=await Test.createTestingModule({controllers:[WebhooksController],providers:[{provide:ProviderService,useValue:{}}]}).compile();
  const app=module.createNestApplication({rawBody:true});
  try{
    await app.init();
    const raw='{ "object": "whatsapp_business_account", "entry": [] }';
    const signature='sha256='+createHmac('sha256',process.env.WHATSAPP_APP_SECRET).update(raw).digest('hex');
    const result=await request(app.getHttpServer()).post('/api/v1/webhooks/whatsapp').set('Content-Type','application/json').set('X-Hub-Signature-256',signature).send(raw);
    assert.equal(result.status,200);assert.equal(result.body.received,true);
    const bad=await request(app.getHttpServer()).post('/api/v1/webhooks/whatsapp').set('Content-Type','application/json').set('X-Hub-Signature-256',signature).send(raw+' ');
    assert.equal(bad.status,403);
  }finally{await app.close();if(old===undefined)delete process.env.WHATSAPP_APP_SECRET;else process.env.WHATSAPP_APP_SECRET=old;}
});
