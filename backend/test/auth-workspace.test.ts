import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { AuthService, safeUser } from '../src/auth/auth.service';
import { registration, validate } from '../src/auth/validation';
import { schemaFor, stores, updates } from '../src/workspace/schemas';
import { WorkspaceService } from '../src/workspace/workspace.service';

test('registration requires confirmed password containing letters and numbers', () => {
  const base = { name: 'Owner', business: 'Store', email: 'owner@example.com', password: 'correctpass123', password_confirmation: 'correctpass123' };
  assert.equal(validate(registration, base).business, 'Store');
  for (const change of [{ password_confirmation: 'different' }, { password: '12345678901', password_confirmation: '12345678901' }, { password: 'onlyletterslong', password_confirmation: 'onlyletterslong' }]) assert.throws(() => validate(registration, { ...base, ...change }));
});

test('resource validation rejects invalid prices, phone numbers and prototype table names', () => {
  assert.throws(() => validate(stores.customers, { name: 'A', phone: '555', tag: 'New' }));
  assert.throws(() => validate(stores.products, { name: 'A', sku: 'one', category: 'Retail', price_paise: -1, stock: 1 }));
  assert.throws(() => schemaFor(stores, '__proto__'));
  assert.throws(() => validate(updates.conversations, { unread: 5 }));
});

test('safe account response never exposes password or remember token', () => {
  assert.deepEqual(safeUser({ id: 1, name: 'Owner', password: 'hash', remember_token: 'secret' }), { id: 1, name: 'Owner' });
});

test('login accepts existing Laravel bcrypt $2y$ hashes and regenerates the session', async () => {
  const hash = (await bcrypt.hash('correctpass123', 4)).replace('$2b$', '$2y$');
  const user = { id: 7, email: 'owner@example.com', password: hash };
  const db = () => ({ where: () => ({ first: async () => user }) });
  const auth = new AuthService({ db } as any);
  let regenerated = false;
  const req: any = { session: { cookie: {}, regenerate(callback: any) { regenerated = true; callback(); }, save(callback: any) { callback(); } } };
  const result = await auth.login(req, { email: user.email, password: 'correctpass123' });
  assert.equal(regenerated, true); assert.equal(req.session.userId, 7); assert.equal(req.session.csrf.length, 64);
  assert.equal((result.data as any).password, undefined);
  assert.equal(req.session.cookie.maxAge, 86400000);
  await auth.login(req, { email: user.email, password: 'correctpass123', remember: true });
  assert.equal(req.session.cookie.maxAge, 30 * 86400000);
  await assert.rejects(() => auth.login(req, { email: user.email, password: 'wrong' }), /credentials/);
});

test('workspace refuses live simulation and cross-tenant conversation replies', async () => {
  const database: any = { db: (table: string) => ({ where: () => ({ first: async () => table === 'businesses' ? { id: 1, demo: false } : undefined }) }) };
  const service = new WorkspaceService(database, {} as any);
  await assert.rejects(() => service.simulate(1, 99, { body: 'hello' }), /Forbidden/);
  await assert.rejects(() => service.message(1, 99, { body: 'hello', direction: 'note' }), /Not Found/);
});

test('expired reset tokens cannot update users', async () => {
  let updated = false;
  const trx: any = () => ({ where: () => ({ forUpdate: () => ({ first: async () => ({ token: 'hash', created_at: new Date(Date.now() - 7200000) }) }), update: async () => { updated = true; } }) });
  const service = new AuthService({ db: { transaction: async (callback: any) => callback(trx) } } as any);
  await assert.rejects(() => service.reset({ email: 'owner@example.com', token: 'old', password: 'correctpass123', password_confirmation: 'correctpass123' }), /invalid or expired/);
  assert.equal(updated, false);
});

test('successful reset removes all existing account sessions and consumes the token', async () => {
  const tokenHash = await bcrypt.hash('valid-reset-token', 4);
  const deleted: string[] = [];
  let passwordUpdated = false;
  const trx: any = (table: string) => ({ where(filter: any) {
    return {
      forUpdate: () => ({ first: async () => ({ token: tokenHash, created_at: new Date() }) }),
      first: async () => ({ id: 7 }),
      update: async (data: any) => { passwordUpdated = await bcrypt.compare('newpassword123', data.password); },
      delete: async () => { if (table === 'node_sessions') assert.deepEqual(filter, { user_id: 7 }); deleted.push(table); },
    };
  } });
  const service = new AuthService({ db: { transaction: async (callback: any) => callback(trx) } } as any);
  await service.reset({ email: 'owner@example.com', token: 'valid-reset-token', password: 'newpassword123', password_confirmation: 'newpassword123' });
  assert.equal(passwordUpdated, true);
  assert.deepEqual(deleted, ['node_sessions', 'password_reset_tokens']);
});
