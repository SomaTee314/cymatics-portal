/**
 * Runs the Python portal build then syncs into public/ for Next.js.
 * Uses python3 first on Unix (Vercel), python first on Windows.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const order = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
let ok = false;
for (const cmd of order) {
  const r = spawnSync(cmd, ['_build_portal.py'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status === 0) {
    ok = true;
    break;
  }
}
if (!ok) {
  process.exit(1);
}

const sync = spawnSync(process.execPath, ['scripts/sync-cymatics-public.mjs'], { stdio: 'inherit' });
if (sync.status !== 0) {
  process.exit(sync.status ?? 1);
}

/* Root index.html is the static portal artifact; Vercel’s Next output can lose `/` if it lingers here. */
if (process.env.VERCEL) {
  try {
    fs.unlinkSync(path.join(root, 'index.html'));
  } catch {
    /* ignore */
  }
}
process.exit(0);
