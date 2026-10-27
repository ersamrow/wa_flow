import { ForbiddenException, Injectable, OnModuleDestroy } from '@nestjs/common';
import knex, { Knex } from 'knex';
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Knex;
  constructor() {
    if (process.env.DB_CONNECTION && process.env.DB_CONNECTION !== 'mysql') throw new Error('Nest API requires the existing MySQL database.');
    const url = process.env.DB_URL ? new URL(process.env.DB_URL) : null;
    this.db = knex({ client: 'mysql2', connection: {
      host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_DATABASE, user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
      ...(url ? { host: url.hostname, port: Number(url.port || 3306), database: decodeURIComponent(url.pathname.slice(1)), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) } : {}),
      ssl: process.env.DB_SSL === 'true' ? {} : undefined,
      timezone: 'Z', dateStrings: true, supportBigNumbers: true, bigNumberStrings: false,
      typeCast(field: any, next: () => unknown) { if (field.type === 'JSON') { const value=field.string('utf8'); return value == null ? null : JSON.parse(value); } return next(); },
    }, pool: { min: 0, max: Number(process.env.DB_POOL_MAX || 10) } });
  }
  async tenant(userId: number, write = false): Promise<number> {
    const member = await this.db('business_users').where('user_id', userId).orderBy('id').first();
    if (!member || (write && !['owner','admin','manager'].includes(member.role))) throw new ForbiddenException('This workspace is not accessible.');
    return Number(member.business_id);
  }
  async onModuleDestroy() { await this.db.destroy(); }
}

