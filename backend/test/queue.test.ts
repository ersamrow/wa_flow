import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { QueueService } from '../src/common/queue.service';

for(const kind of ['process-webhook','send-whatsapp'])test(`interrupted ${kind} follows its safe recovery policy`,async()=>{
  const updates:any[]=[];let failures=0;
  const row={id:1,kind,attempts:1,lock_owner:'old-owner',payload:JSON.stringify({eventId:7,messageId:8})};
  const query:any={where(){return this},andWhere(){return this},select:async()=>[row],update:async(data:any)=>{updates.push(data);return 1}};
  const db:any=()=>query;db.transaction=async()=>null;
  const queue=new QueueService({db} as any);
  queue.setHandler(kind,async()=>{},async()=>{failures++});
  await queue.tick();
  assert.equal(updates[0].status,kind==='process-webhook'?'pending':'failed');
  assert.equal(failures,kind==='process-webhook'?0:1);
});
