/**
 * Smoke test: anon client can reach public.profiles (RLS may return 0 rows).
 * Run: node scripts/test-supabase.mjs
 *
 * Loads .env.local with override so stale shell env (e.g. old NEXT_PUBLIC_*)
 * does not win over Node's --env-file behaviour.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.');
  process.exit(1);
}

const supabase = createClient(url, anon);

const { error, count } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true });

if (error) {
  console.error('Connection failed:', error.message);
  if (
    error.message.includes('does not exist') ||
    error.code === '42P01'
  ) {
    console.log('Table "profiles" not found — run sql migrations (scripts/run-migrations.mjs or SQL Editor).');
  }
  process.exit(1);
}

console.log('Supabase connected. profiles table exists (row count:', count ?? 0, ').');
