import test from 'node:test';
import assert from 'node:assert/strict';
const enabled=process.env.RUN_API_SMOKE==='true';
const origin=process.env.API_SMOKE_ORIGIN||'http://127.0.0.1:4000';
test('native API persists sessions and rejects unauthenticated, CSRF, and malformed writes',{skip:!enabled},async()=>{
  const first=await fetch(`${origin}/api/v1/session`);assert.equal(first.status,200);
  const body=await first.json();assert.equal(body.data.user,null);assert.equal(body.data.csrf.length,64);
  const cookie=first.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);assert.match(first.headers.get('set-cookie')!,/HttpOnly/i);
  const again=await fetch(`${origin}/api/v1/session`,{headers:{Cookie:cookie!}});assert.equal((await again.json()).data.csrf,body.data.csrf);
  assert.equal((await fetch(`${origin}/api/v1/workspace`,{headers:{Cookie:cookie!}})).status,401);
  const post=(token:string,values:unknown)=>fetch(`${origin}/api/v1/auth/login`,{method:'POST',headers:{Cookie:cookie!,'Content-Type':'application/json','X-CSRF-TOKEN':token},body:JSON.stringify(values)});
  assert.equal((await post('',{})).status,419);
  assert.equal((await post('é'.repeat(64),{})).status,419);
  assert.equal((await post(body.data.csrf,{})).status,422);
  const badOrigin=await fetch(`${origin}/api/v1/auth/logout`,{method:'POST',headers:{Cookie:cookie!,'X-CSRF-TOKEN':body.data.csrf,Origin:'https://attacker.example'}});assert.equal(badOrigin.status,419);
});
