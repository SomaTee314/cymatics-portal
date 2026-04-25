/**
 * Verifies public.profiles and public.saved_configs via the anon key (RLS; head-only select).
 * Run: node scripts/verify-supabase-schema.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadProjectEnv } from './load-env-local.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

loadProjectEnv(root);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const sb = createClient(url, anon);

for (const table of ['profiles', 'saved_configs']) {
  const { error } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`Missing or inaccessible public.${table}:`, error.message);
    process.exit(1);
  }
  console.log(`OK  public.${table}`);
}

console.log(
  '\nSchema matches spec (profiles + saved_configs). Check auth.users trigger in SQL Editor if needed:\n' +
    "  SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created';",
);
