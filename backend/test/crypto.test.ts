import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoService } from '../src/common/crypto.service';
import { createDecipheriv,createHmac } from 'node:crypto';

test('existing Laravel encryptString credential decrypts without changing APP_KEY',()=>{
  const previous=process.env.APP_KEY;process.env.APP_KEY='base64:'+Buffer.alloc(32,'k').toString('base64');
  try {
    const crypto=new CryptoService();
    const fixture='eyJpdiI6IjdpY1RJWW81eTVkbjdUYnJNVGRESFE9PSIsInZhbHVlIjoib0Zrb3JyWW5iODVsaXBtZFYvT3UybWh0YTM2Zml5aVJMaDZKWjdlM0gxRT0iLCJtYWMiOiIxOTI5ZDZmNWY5MmQ5MjNkN2M5YTRlYzlmMjY4MDExMzBhYzVhM2ExOTEyMTQyYWFhYTllMjZmZjY1MDAxMzExIiwidGFnIjoiIn0=';
    assert.equal(crypto.decrypt(fixture),'migration-credential-test');
    const tampered=JSON.parse(Buffer.from(fixture,'base64').toString());tampered.value=tampered.value.replace(/^./,'X');
    assert.throws(()=>crypto.decrypt(Buffer.from(JSON.stringify(tampered)).toString('base64')),/could not be verified/);
    const encrypted=JSON.parse(Buffer.from(crypto.encrypt('roundtrip'),'base64').toString());
    assert.equal(encrypted.mac,createHmac('sha256',Buffer.alloc(32,'k')).update(encrypted.iv+encrypted.value).digest('hex'));
    const decipher=createDecipheriv('aes-256-cbc',Buffer.alloc(32,'k'),Buffer.from(encrypted.iv,'base64'));
    assert.equal(Buffer.concat([decipher.update(Buffer.from(encrypted.value,'base64')),decipher.final()]).toString(),'roundtrip');
  }finally{if(previous===undefined)delete process.env.APP_KEY;else process.env.APP_KEY=previous;}
});
