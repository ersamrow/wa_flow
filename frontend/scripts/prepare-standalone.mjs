import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
// Next nests the server under frontend/ only when the monorepo root is visible to the build.
const nested=new URL('.next/standalone/frontend/',root);
const flat=new URL('.next/standalone/',root);
const target=existsSync(fileURLToPath(new URL('server.js',nested)))?nested:flat;
if(!existsSync(fileURLToPath(new URL('server.js',target)))){console.error('Standalone server.js not found; did next build finish?');process.exit(1);}
await mkdir(new URL('.next/',target),{recursive:true});
await cp(new URL('.next/static/',root),new URL('.next/static/',target),{recursive:true});
const publicDir=new URL('public/',root);
if(existsSync(fileURLToPath(publicDir)))await cp(publicDir,new URL('public/',target),{recursive:true});
