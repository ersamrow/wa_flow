import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArgumentsHost } from '@nestjs/common';
import { ApiExceptionFilter } from '../src/common/exception.filter';

test('late session database failure does not send a second HTTP response', () => {
  for (const writableEnded of [false, true]) {
    let ends = 0;
    const response = {
      headersSent: true, writableEnded,
      status() { throw new Error('Cannot set headers after they are sent'); },
      json() { throw new Error('Must not send a second body'); },
      end() { ends++; },
    };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
    assert.doesNotThrow(() => new ApiExceptionFilter().catch({ code: 'ER_NO_SUCH_TABLE' }, host));
    assert.equal(ends, writableEnded ? 0 : 1);
  }
});

test('database failure before headers returns a generic 500 without SQL details', () => {
  let status: number | undefined;
  let body: unknown;
  const response = {
    headersSent: false,
    status(value: number) { status = value; return this; },
    json(value: unknown) { body = value; },
  };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  new ApiExceptionFilter().catch({code:'ER_NO_SUCH_TABLE', sql:'sensitive SQL'}, host);
  assert.equal(status, 500);
  assert.deepEqual(body, { message: 'The request could not be completed. Please try again.' });
});
