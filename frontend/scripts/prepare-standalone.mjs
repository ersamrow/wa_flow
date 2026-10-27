import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
const target=new URL('.next/standalone/frontend/',root);
await mkdir(new URL('.next/',target),{recursive:true});
await cp(new URL('.next/static/',root),new URL('.next/static/',target),{recursive:true});
const publicDir=new URL('public/',root);
if(existsSync(fileURLToPath(publicDir)))await cp(publicDir,new URL('public/',target),{recursive:true});
