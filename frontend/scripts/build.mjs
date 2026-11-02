import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
// next build must run with NODE_ENV=production; hosts that inject another value break prerendering.
const env = { ...process.env, NODE_ENV: 'production' };
const cwd = fileURLToPath(new URL('../', import.meta.url));
const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
const run = (args) => {
  const r = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run([next, 'build', '--webpack']);
run(['scripts/prepare-standalone.mjs']);
