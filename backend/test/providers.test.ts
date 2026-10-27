import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySignature, supportedTemplate, validAiAnswer, same, inWindow } from '../src/providers/helpers';
test('webhook HMAC authenticates exact bytes and rejects forged or malformed input',()=>{
 const raw=Buffer.from('{"entry":[]}'); const secret='test-secret';const signature='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
 assert.deepEqual(verifySignature(raw,secret,signature,'sha256='),{entry:[]});
 assert.throws(()=>verifySignature(Buffer.from('{"entry": []}'),secret,signature,'sha256='));
 assert.throws(()=>verifySignature(raw,secret,'sha256=forged','sha256='));
 assert.throws(()=>verifySignature(raw,undefined,signature,'sha256='));
 const invalid=Buffer.from('null');assert.throws(()=>verifySignature(invalid,secret,createHmac('sha256',secret).update(invalid).digest('hex')));
 assert.throws(()=>verifySignature(Buffer.alloc(1048577),secret,'x'));
});
test('supported templates exclude unapproved, media headers, buttons and named variables',()=>{
 assert.equal(supportedTemplate({status:'APPROVED',components:[{type:'BODY',text:'Hi {{1}}'},{type:'HEADER',format:'TEXT',text:'Welcome'}]}),true);
 for(const component of [{type:'HEADER',format:'IMAGE'},{type:'HEADER',format:'TEXT',text:'Hi {{1}}'},{type:'BUTTONS'},{type:'BODY',text:'Hi {{name}}'}])assert.equal(supportedTemplate({status:'APPROVED',components:[component]}),false);
 assert.equal(supportedTemplate({status:'PENDING',components:[]}),false);
});
test('AI must finish and cite only supplied tenant sources',()=>{
 const answer=(a:unknown,status='completed')=>({status,output:[{content:[{type:'output_text',text:JSON.stringify(a)}]}]}); const sources=[{id:'knowledge:1'}];
 assert.equal(validAiAnswer(answer({reply:' Approved answer ',handover:false,source_ids:['knowledge:1']}),sources),'Approved answer');
 for(const a of [{reply:'Answer',handover:false,source_ids:['knowledge:other-tenant']},{reply:'Answer',handover:false,source_ids:[]},{reply:'Answer',handover:true,source_ids:['knowledge:1']},{reply:'',handover:false,source_ids:['knowledge:1']}])assert.equal(validAiAnswer(answer(a),sources),null);
 assert.equal(validAiAnswer(answer({reply:'Answer',handover:false,source_ids:['knowledge:1']},'incomplete'),sources),null);
});
test('reply window closes after 24 hours and signature comparison rejects lengths',()=>{
 assert.equal(!!inWindow(new Date(Date.now()-86400001)),false);assert.equal(!!inWindow(new Date(Date.now()-1000)),true);assert.equal(!!inWindow(null),false);assert.equal(same('abc','abcd'),false);
});

test('Graph transport uses bearer credentials and preserves ambiguous outcome without retry',async()=>{
 const {ProviderService}=await import('../src/providers/provider.service');
 const original=globalThis.fetch;const oldVersion=process.env.WHATSAPP_GRAPH_VERSION;process.env.WHATSAPP_GRAPH_VERSION='v23.0';let calls=0;
 try{
  globalThis.fetch=async(input,options)=>{calls++;assert.equal(String(input),'https://graph.facebook.com/v23.0/12345/messages');assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer tenant-token');throw new Error('connection closed after upload');};
  const provider=new ProviderService({} as any,{} as any,{} as any);
  await assert.rejects(()=>provider.graph('tenant-token','POST','12345/messages',{type:'text'}),(e:any)=>e.providerStatus===0&&e.getStatus()===422);
  assert.equal(calls,1,'an ambiguous POST must never be retried automatically');
  globalThis.fetch=async()=>new Response('{"error":{"message":"private provider diagnostic"}}',{status:401});
  await assert.rejects(()=>provider.graph('tenant-token','POST','12345/messages',{}),(e:any)=>e.providerStatus===401&&!e.message.includes('private'));
 }finally{globalThis.fetch=original;if(oldVersion===undefined)delete process.env.WHATSAPP_GRAPH_VERSION;else process.env.WHATSAPP_GRAPH_VERSION=oldVersion;}
});
