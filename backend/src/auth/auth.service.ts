import { Injectable, NotFoundException, UnprocessableEntityException, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { DatabaseService } from '../common/database.service';
import type { AppRequest } from '../common/request';
import { password, registration, validate } from './validation';
import { seedDemo } from './demo';
import { mailUnavailable, resetMailOptions } from './reset-mail';

export function safeUser(user: any) {
  if (!user) return null;
  const { password: _password, remember_token: _remember, ...safe } = user;
  return safe;
}

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async signIn(req: AppRequest, user: any, remember = false) {
    await new Promise<void>((resolve, reject) => req.session.regenerate((error: unknown) => error ? reject(error) : resolve()));
    req.session.userId = Number(user.id);
    req.session.csrf = randomBytes(32).toString('hex');
    req.session.cookie.maxAge = remember ? 30 * 86400000 : 86400000;
    await new Promise<void>((resolve, reject) => req.session.save((error: unknown) => error ? reject(error) : resolve()));
    return { data: safeUser(user) };
  }

  async register(req: AppRequest, body: unknown) {
    const input = validate(registration, body);
    if (await this.database.db('users').where({ email: input.email }).first()) throw new UnprocessableEntityException({ message: 'The email has already been taken.', errors: { email: ['The email has already been taken.'] } });
    const hashed = await bcrypt.hash(input.password, 12);
    let user: any;
    try {
      user = await this.database.db.transaction(async trx => {
        const now = new Date();
        const [id] = await trx('users').insert({ name: input.name, email: input.email, password: hashed, created_at: now, updated_at: now });
        const [businessId] = await trx('businesses').insert({ name: input.business, email: input.email, created_at: now, updated_at: now });
        await trx('business_users').insert({ business_id: businessId, user_id: id, role: 'owner' });
        return trx('users').where({ id }).first();
      });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') throw new UnprocessableEntityException({ message: 'The email has already been taken.', errors: { email: ['The email has already been taken.'] } });
      throw error;
    }
    return this.signIn(req, user);
  }

  async login(req: AppRequest, body: unknown) {
    const input = validate(z.object({ email: z.string().email().max(255), password: z.string().max(200), remember: z.boolean().optional().default(false) }), body);
    const user = await this.database.db('users').where({ email: input.email.toLowerCase() }).first();
    const valid = await bcrypt.compare(input.password, (user?.password ?? '$2b$12$AcLcfGJk1WWVzRC6sJfh0ODxIbq9fmgJJRg/JfGxJf.GXVr3Dqw4K').replace(/^\$2y\$/, '$2b$'));
    if (!user || !valid) throw new UnprocessableEntityException({ message: 'These credentials do not match our records.', errors: { email: ['These credentials do not match our records.'] } });
    return this.signIn(req, user, input.remember);
  }

  async demo(req: AppRequest) {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    const hash = await bcrypt.hash(randomUUID(), 12);
    const user = await this.database.db.transaction(trx => seedDemo(trx, hash));
    return this.signIn(req, user);
  }

  async forgot(body: unknown) {
    const { email } = validate(z.object({ email: z.string().trim().email().max(255).toLowerCase() }), body);
    const mailOptions = resetMailOptions();
    const db = this.database.db;
    const user = await db('users').where({ email }).first();
    if (user) {
      const token = randomBytes(32).toString('hex');
      await db('password_reset_tokens').insert({ email, token: await bcrypt.hash(token, 12), created_at: new Date() }).onConflict('email').merge();
      const transport = nodemailer.createTransport(mailOptions);
      const url = new URL('/reset-password', process.env.APP_URL ?? 'http://localhost:3000');
      url.searchParams.set('token', token); url.searchParams.set('email', email);
      try {
        await transport.sendMail({ from: process.env.MAIL_FROM_ADDRESS!, to: email, subject: 'Reset your WaFlow password', text: `Reset your password using this link within 60 minutes: ${url}` });
      } catch {
        throw new ServiceUnavailableException(mailUnavailable);
      } finally {
        transport.close();
      }
    }
    return { message: 'If an account exists, a password reset link has been sent.' };
  }

  async reset(body: unknown) {
    const input = validate(z.object({ email: z.string().email(), token: z.string().min(1).max(200), password, password_confirmation: z.string() }).refine(v => v.password === v.password_confirmation, { path: ['password'], message: 'The password confirmation does not match.' }), body);
    await this.database.db.transaction(async trx => {
      const row = await trx('password_reset_tokens').where({ email: input.email }).forUpdate().first();
      if (!row || !row.created_at || Date.now() - new Date(row.created_at).getTime() > 3600000 || !await bcrypt.compare(input.token, String(row.token).replace(/^\$2y\$/, '$2b$'))) throw new UnprocessableEntityException({ message: 'This password reset token is invalid or expired.', errors: { email: ['This password reset token is invalid or expired.'] } });
      await trx('users').where({ email: input.email }).update({ password: await bcrypt.hash(input.password, 12), remember_token: randomBytes(30).toString('hex'), updated_at: new Date() });
      const user = await trx('users').where({ email: input.email }).first('id');
      if (user) await trx('node_sessions').where({ user_id: user.id }).delete();
      await trx('password_reset_tokens').where({ email: input.email }).delete();
    });
    return { message: 'Your password has been reset.' };
  }
}
