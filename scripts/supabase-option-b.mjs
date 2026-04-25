/**
 * Option B: Supabase CLI — login → link → db push
 *
 * Requires in .env.local:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_DB_PASSWORD   — Project Settings → Database (Postgres password)
 *   NEXT_PUBLIC_SUPABASE_URL — used to derive project ref, or set SUPABASE_PROJECT_REF
 *
 * Usage: node scripts/supabase-option-b.mjs
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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

function projectRefFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const host = new URL(url).hostname;
    if (host.endsWith('.supabase.co')) {
      return host.slice(0, -'.supabase.co'.length);
    }
    return null;
  } catch {
    return null;
  }
}

function runSupabase(args) {
  const result = spawnSync('npx', ['supabase', ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

loadEnvLocal();

const ref =
  (process.env.SUPABASE_PROJECT_REF || '').trim() ||
  projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const token = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const password = (process.env.SUPABASE_DB_PASSWORD || '').trim();

if (!ref) {
  console.error(
    'Missing project ref. Set NEXT_PUBLIC_SUPABASE_URL (https://xxxx.supabase.co) or SUPABASE_PROJECT_REF in .env.local.\n',
  );
  process.exit(1);
}

if (!token) {
  console.error(`Missing SUPABASE_ACCESS_TOKEN.

Create a personal access token:
  https://supabase.com/dashboard/account/tokens

Add to .env.local:
  SUPABASE_ACCESS_TOKEN=sbp_...
`);
  process.exit(1);
}

if (!password) {
  console.error(`Missing SUPABASE_DB_PASSWORD.

Use the database password from Supabase → Project Settings → Database (not the anon or service_role keys).

Add to .env.local:
  SUPABASE_DB_PASSWORD=your_postgres_password
`);
  process.exit(1);
}

console.log('→ supabase login --token <hidden> --no-browser\n');
runSupabase(['login', '--token', token, '--no-browser']);

console.log(`→ supabase link --project-ref ${ref} -p <hidden> --yes\n`);
runSupabase(['link', '--project-ref', ref, '-p', password, '--yes']);

console.log('→ supabase db push --include-all --yes\n');
runSupabase(['db', 'push', '--include-all', '--yes']);

console.log('\nMigrations pushed to the linked Supabase project.\n');
