import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { relative, isAbsolute } from 'node:path';
const root=new URL('../',import.meta.url);
// Next nests the server under frontend/ only when the monorepo root is visible to the build.
const nested=new URL('.next/standalone/frontend/',root);
const flat=new URL('.next/standalone/',root);
const target=existsSync(fileURLToPath(new URL('server.js',nested)))?nested:flat;
if(!existsSync(fileURLToPath(new URL('server.js',target)))){console.error('Standalone server.js not found; did next build finish?');process.exit(1);}
// Hosts may publish only the directory containing server.js. Keep traced,
// hoisted dependencies beside that entry rather than in its parent directory.
const sharedModules = new URL('node_modules/', flat);
if (target === nested && existsSync(sharedModules)) {
  await cp(sharedModules, new URL('node_modules/', target), {
    recursive: true, dereference: true, force: false, errorOnExist: false,
  });
}
const require = createRequire(new URL('server.js', target));
for (const dependency of ['next', 'react', 'react-dom', 'next/dist/server/lib/start-server']) {
  const resolved = require.resolve(dependency);
  const location = relative(fileURLToPath(target), resolved);
  if (location.startsWith('..') || isAbsolute(location)) {
    throw new Error(`Standalone dependency ${dependency} resolves outside the deployment: ${resolved}`);
  }
}
await mkdir(new URL('.next/',target),{recursive:true});
await cp(new URL('.next/static/',root),new URL('.next/static/',target),{recursive:true});
const publicDir=new URL('public/',root);
if(existsSync(fileURLToPath(publicDir)))await cp(publicDir,new URL('public/',target),{recursive:true});
console.log('Standalone web ready: server.js, static assets, and runtime dependencies are colocated.');
