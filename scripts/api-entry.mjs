import { mkdir, writeFile } from 'node:fs/promises';
// Hosting expects the API entry at <repo>/dist/main.js; the compiled app lives in backend/dist.
const dist = new URL('../dist/', import.meta.url);
await mkdir(dist, { recursive: true });
await writeFile(new URL('main.js', dist), "require('../backend/dist/main.js');\n");
