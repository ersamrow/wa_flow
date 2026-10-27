import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DatabaseService } from '../common/database.service';
import type { AppRequest } from '../common/request';
import { AuthService, safeUser } from './auth.service';

@Controller('api/v1')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly database: DatabaseService) {}
  @Get('session') async session(@Req() req: AppRequest) {
    req.session.csrf ??= randomBytes(32).toString('hex');
    const user = req.session.userId ? await this.database.db('users').where({ id: req.session.userId }).first() : null;
    return { data: { user: safeUser(user), csrf: req.session.csrf, demo_available: process.env.NODE_ENV !== 'production' } };
  }
  @Post('auth/register') register(@Req() req: AppRequest, @Body() body: unknown) { return this.auth.register(req, body); }
  @Post('auth/login') @HttpCode(200) login(@Req() req: AppRequest, @Body() body: unknown) { return this.auth.login(req, body); }
  @Post('auth/demo') @HttpCode(200) demo(@Req() req: AppRequest) { return this.auth.demo(req); }
  @Post('auth/logout') @HttpCode(200) async logout(@Req() req: AppRequest) {
    await new Promise<void>((resolve, reject) => req.session.regenerate((error: unknown) => error ? reject(error) : resolve()));
    req.session.csrf = randomBytes(32).toString('hex');
    return { data: { logged_out: true } };
  }
  @Post('auth/forgot-password') @HttpCode(200) forgot(@Body() body: unknown) { return this.auth.forgot(body); }
  @Post('auth/reset-password') @HttpCode(200) reset(@Body() body: unknown) { return this.auth.reset(body); }
}
