import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../frontend/features/workspace/facebookSignup.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { parseSignupEvent } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const finish = { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: { waba_id: '555555', phone_number_id: '666666' } };
test('accepts completed signup messages only from exact HTTPS Facebook origins', () => {
  for (const origin of ['https://www.facebook.com', 'https://web.facebook.com', 'https://business.facebook.com']) {
    assert.deepEqual(parseSignupEvent(origin, JSON.stringify(finish)), { event: 'FINISH', assets: { waba_id: '555555', phone_number_id: '666666' } });
  }
  for (const origin of ['https://evilfacebook.com', 'https://www.facebook.com.evil.com', 'http://www.facebook.com', 'null', 'https://example.com']) assert.equal(parseSignupEvent(origin, finish), null);
});
test('ignores unrelated and malformed cross-window messages', () => {
  for (const raw of ['not json', null, {}, [], { ...finish, type: 'OTHER' }, { ...finish, event: 'UNKNOWN' }]) assert.equal(parseSignupEvent('https://www.facebook.com', raw), null);
});
test('requires both string IDs before completing signup', () => {
  for (const data of [undefined, {}, { waba_id: '555555' }, { waba_id: '555555', phone_number_id: 666666 }, { waba_id: '555555', phone_number_id: '../bad' }]) assert.deepEqual(parseSignupEvent('https://www.facebook.com', { ...finish, data }), { event: 'INCOMPLETE' });
});
test('handles cancellation, errors and unsupported completion variants', () => {
  assert.deepEqual(parseSignupEvent('https://www.facebook.com', { ...finish, event: 'CANCEL' }), { event: 'CANCEL' });
  for (const event of ['ERROR', 'FINISH_ONLY_WABA', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING']) assert.deepEqual(parseSignupEvent('https://www.facebook.com', { ...finish, event }), { event: 'INCOMPLETE' });
});
