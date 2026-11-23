import test from 'node:test';
import assert from 'node:assert/strict';
import { signupExchangeError } from '../src/providers/signup-error';

test('signup exchange exposes Meta diagnostics without the raw response', () => {
  const message = signupExchangeError({ error: {
    message: 'Invalid verification code. Please make sure your redirect_uri is identical.',
    type: 'OAuthException', code: 100, error_subcode: 36008, fbtrace_id: 'trace-123',
    internal: 'private extra data',
  }, access_token: 'private-token' }, 400, []);
  assert.match(message, /Invalid verification code/);
  for (const detail of ['HTTP 400', 'type: OAuthException', 'code: 100', 'subcode: 36008', 'trace: trace-123']) {
    assert.ok(message.includes(detail));
  }
  assert.ok(!message.includes('private'));
  assert.match(message, /WhatsApp Embedded Signup login variation/);
  assert.match(message, /System-user access token/);
});

test('signup diagnostics redact credentials and authorization codes', () => {
  const message = signupExchangeError({ error: { message:
    'secret-value signup-value token-value client_secret=unknown&access_token=another code=opaque' } },
    400, ['secret-value', 'signup-value', 'token-value']);
  for (const secret of ['secret-value', 'signup-value', 'token-value', 'unknown', 'another', 'opaque']) {
    assert.ok(!message.includes(secret));
  }
  assert.match(message, /\[redacted\]/);
  assert.ok(!message.includes('System-user'));
});

test('missing or malformed Meta errors produce a useful fallback', () => {
  for (const payload of [null, 'not JSON', {}, { error: 'bad' }, { error: { message: 123 } }]) {
    assert.match(signupExchangeError(payload, 502, []), /HTTP 502.*no error details/);
  }
});
