import { cp, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Keep the workspace layout inside the artifact so npm can use the existing lockfile.
const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await mkdir(dist, { recursive: true });
for (const path of ['package.json', 'package-lock.json', 'backend/package.json', 'frontend/package.json']) {
  await mkdir(new URL('./', new URL(path, dist)), { recursive: true });
  await cp(new URL(path, root), new URL(path, dist));
}
await cp(new URL('backend/dist/', root), new URL('backend/dist/', dist), { recursive: true });
// npm ci creates an isolated, lockfile-pinned production dependency tree.
// Invoke npm through Node to also support Windows without a shell.
if (!process.env.npm_execpath) throw new Error('Run this script through npm run build:api.');
execFileSync(process.execPath, [process.env.npm_execpath, 'ci', '--omit=dev',
  '--workspace=@waflow/api', '--include-workspace-root=false', '--ignore-scripts',
  '--no-audit', '--no-fund'], { cwd: fileURLToPath(dist), stdio: 'inherit' });
await writeFile(new URL('main.js', dist), "require('./backend/dist/main.js');\n");
console.log('Standalone API ready in dist/ (entry: main.js).');
