/**
 * Re-authorise Supabase CLI: logout, then login via token or instructions.
 *
 * Token: create at https://supabase.com/dashboard/account/tokens
 * Add SUPABASE_ACCESS_TOKEN=sbp_... to .env.local, then: npm run db:supabase:reauth
 *
 * Interactive: npm run db:supabase:login (browser)
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvLocal() {
  const p = path.join(root, '.env.local');
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvLocal();

console.log('Clearing local Supabase CLI session (if any)…\n');
spawnSync('npx', ['supabase', 'logout', '--yes'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (token && token.startsWith('sbp_')) {
  console.log('\nLogging in with SUPABASE_ACCESS_TOKEN from .env.local…\n');
  const r = spawnSync('npx', ['supabase', 'login', '--token', token, '--no-browser'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  process.exit(r.status ?? 1);
}

if (token) {
  console.error(
    '\nSUPABASE_ACCESS_TOKEN must start with sbp_ (create a new token in the Supabase dashboard).\n',
  );
  process.exit(1);
}

console.log(`
No SUPABASE_ACCESS_TOKEN in .env.local.

Option A — non-interactive (recommended for scripts)
  1. Open: https://supabase.com/dashboard/account/tokens
  2. Generate a token (format: sbp_...)
  3. Add to .env.local:
       SUPABASE_ACCESS_TOKEN=sbp_your_token_here
  4. Run: npm run db:supabase:reauth

Option B — interactive (opens browser)
  Run: npm run db:supabase:login
`);
process.exit(1);
