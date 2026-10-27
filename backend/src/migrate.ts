import './environment';
import 'reflect-metadata';
import { DatabaseService } from './common/database.service';

export async function migrate(database:DatabaseService){
  const db=database.db;
  for(const table of ['users','businesses','business_users','customers','conversations','messages','products','automations','knowledge','campaigns','whatsapp_accounts','whatsapp_signup_attempts','subscriptions','usage_months','webhook_events','billing_payments','password_reset_tokens']){
    if(!await db.schema.hasTable(table))throw new Error(`Missing existing application table: ${table}. Restore the complete existing MySQL schema before migration.`);
  }
  if(!await db.schema.hasTable('node_sessions'))await db.schema.createTable('node_sessions',t=>{t.string('id',128).primary();t.bigInteger('user_id').unsigned().nullable().index();t.json('payload').notNullable();t.dateTime('expires_at').notNullable().index();});
  if(!await db.schema.hasTable('node_jobs'))await db.schema.createTable('node_jobs',t=>{t.bigIncrements('id');t.string('kind',80).notNullable();t.json('payload').notNullable();t.string('status',24).notNullable().defaultTo('pending');t.integer('attempts').unsigned().defaultTo(0);t.dateTime('available_at').notNullable();t.dateTime('locked_at').nullable();t.string('lock_owner',64).nullable();t.string('last_error',120).nullable();t.dateTime('created_at').notNullable();t.dateTime('completed_at').nullable();t.index(['status','available_at']);});
  console.log('Node session and job tables ready; existing application tables were preserved.');
}
if(require.main===module){const database=new DatabaseService();void migrate(database).catch(error=>{console.error(error?.message?.startsWith('Missing existing application table')?error.message:'Migration failed. Check MySQL connectivity and privileges.');process.exitCode=1;}).finally(()=>database.onModuleDestroy());}
