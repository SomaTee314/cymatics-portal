/**
 * Re-authorise Supabase CLI: logout, then login via token or instructions.
 *
 * Token: create at https://supabase.com/dashboard/account/tokens
 * Add SUPABASE_ACCESS_TOKEN=sbp_... to .env.sh, then: npm run db:supabase:reauth
 *
 * Interactive: npm run db:supabase:login (browser)
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadProjectEnv } from './load-env-local.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

loadProjectEnv(root);

console.log('Clearing local Supabase CLI session (if any)…\n');
spawnSync('npx', ['supabase', 'logout', '--yes'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (token && token.startsWith('sbp_')) {
  console.log('\nLogging in with SUPABASE_ACCESS_TOKEN from .env.sh…\n');
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
No SUPABASE_ACCESS_TOKEN in .env.sh (or .env.local).

Option A — non-interactive (recommended for scripts)
  1. Open: https://supabase.com/dashboard/account/tokens
  2. Generate a token (format: sbp_...)
  3. Add to .env.sh:
       SUPABASE_ACCESS_TOKEN=sbp_your_token_here
  4. Run: npm run db:supabase:reauth

Option B — interactive (opens browser)
  Run: npm run db:supabase:login
`);
process.exit(1);
