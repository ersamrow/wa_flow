import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SignupService } from '../src/providers/signup.service';
import type { ProviderService } from '../src/providers/provider.service';

test('Embedded Signup uses the documented GET exchange and preserves Meta errors', async (t) => {
  const updates: Record<string, unknown>[] = [];
  const query = {
    where() { return this; },
    async update(value: Record<string, unknown>) { updates.push(value); return 1; },
  };
  const service = new SignupService({ db: () => query } as unknown as ProviderService);
  t.mock.method(service, 'attempt', async () => ({ id: 1 }));
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(init?.method, 'GET');
    assert.equal(init?.body, undefined);
    assert.equal(url.origin, 'https://graph.facebook.com');
    assert.ok(url.pathname.endsWith('/oauth/access_token'));
    assert.equal(url.searchParams.get('code'), 'test-code');
    assert.ok(url.searchParams.has('client_id'));
    assert.ok(url.searchParams.has('client_secret'));
    assert.equal(url.searchParams.has('redirect_uri'), false);
    return new Response(JSON.stringify({ error: {
      message: 'Redirect URI mismatch', type: 'OAuthException', code: 100, error_subcode: 36008,
    } }), { status: 400 });
  });
  await assert.rejects(service.exchange({ code: 'test-code' }, 1, 1, 'session'),
    /Redirect URI mismatch; type: OAuthException; code: 100; subcode: 36008/);
  assert.deepEqual(updates.map(value => value.status), ['exchanging', 'failed']);
  assert.equal(updates[1].access_token, null);
});
