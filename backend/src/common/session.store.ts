import session from 'express-session';
import type { Knex } from 'knex';
export class MysqlSessionStore extends session.Store {
  constructor(private readonly db:Knex){super();}
  get(id:string,callback:(err:any,session?:any)=>void){
    this.db('node_sessions').where('id',id).andWhere('expires_at','>',new Date()).first()
      .then(row=>callback(null,row?(typeof row.payload==='string'?JSON.parse(row.payload):row.payload):null)).catch(callback);
  }
  set(id:string,value:session.SessionData,callback?:(err?:any)=>void){
    const row={id,payload:JSON.stringify(value),expires_at:value.cookie.expires?new Date(value.cookie.expires):new Date(Date.now()+86400000),user_id:value.userId??null};
    this.db('node_sessions').insert(row).onConflict('id').merge().then(()=>callback?.()).catch(err=>callback?.(err));
  }
  destroy(id:string,callback?:(err?:any)=>void){this.db('node_sessions').where('id',id).delete().then(()=>callback?.()).catch(err=>callback?.(err));}
  touch(id:string,value:session.SessionData,callback?:(err?:any)=>void){this.db('node_sessions').where('id',id).update({expires_at:value.cookie.expires?new Date(value.cookie.expires):new Date(Date.now()+86400000)}).then(()=>callback?.()).catch(err=>callback?.(err));}
}
