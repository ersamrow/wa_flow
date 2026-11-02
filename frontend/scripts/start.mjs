import { existsSync } from 'node:fs';
process.env.HOSTNAME ||= '127.0.0.1';
process.env.PORT ||= '3000';
const nested=new URL('../.next/standalone/frontend/server.js',import.meta.url);
const flat=new URL('../.next/standalone/server.js',import.meta.url);
await import(existsSync(nested)?nested.href:flat.href);
