/**
 * Smoke test: anon client can reach public.profiles (RLS may return 0 rows).
 * Run: node scripts/test-supabase.mjs
 *
 * Loads .env.local with override so stale shell env (e.g. old NEXT_PUBLIC_*)
 * does not win over Node's --env-file behaviour.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './load-env-local.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

loadEnvLocal(root);

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
  if (error.message.includes('does not exist') || error.code === '42P01') {
    console.log('Table "profiles" not found — run sql migrations (scripts/run-migrations.mjs or SQL Editor).');
  }
  process.exit(1);
}

console.log('Supabase connected. profiles table exists (row count:', count ?? 0, ').');
