/**
 * Applies sql/*.sql to the remote Supabase database.
 *
 * Prerequisites (pick one):
 *   A) Set SUPABASE_DB_URL in .env.local (Database → Connection string), then:
 *        node scripts/run-migrations.mjs
 *   B) npx supabase login && npx supabase link --project-ref <ref> -p <db_password>
 *      then: node scripts/run-migrations.mjs
 *
 * CLI v2 uses `supabase db query`, not `db execute`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

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

const FILES = [
  'sql/001_profiles.sql',
  'sql/002_trigger_new_user.sql',
  'sql/003_saved_configs.sql',
];

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

function printManual() {
  console.error(
    '\nCould not run SQL via Supabase CLI. Paste each block into the Supabase SQL Editor (SQL → New query → Run).\n'
  );
  for (const rel of FILES) {
    const fp = path.join(root, rel);
    console.log('\n' + '='.repeat(72));
    console.log(`-- ${rel}`);
    console.log('='.repeat(72) + '\n');
    console.log(fs.readFileSync(fp, 'utf8'));
  }
}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const ref = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

console.log(
  'Project ref (from NEXT_PUBLIC_SUPABASE_URL):',
  ref || '(use a real https://xxxxx.supabase.co URL)'
);
if (dbUrl) {
  console.log('Using SUPABASE_DB_URL for supabase db query.\n');
} else {
  console.log(
    'Using --linked. If this fails, run: npx supabase login && npx supabase link --project-ref',
    ref || '<your-ref>',
    '-p <db_password>\n'
  );
}

let failed = false;
for (const rel of FILES) {
  const filePath = path.join(root, rel);
  const args = ['supabase', 'db', 'query', '-f', filePath];
  if (dbUrl) args.push('--db-url', dbUrl);
  else args.push('--linked');

  console.log(`\n→ ${rel}`);
  const result = spawnSync('npx', args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });
  if (result.status !== 0) {
    failed = true;
    break;
  }
}

if (failed) {
  printManual();
  process.exit(1);
}

console.log('\nAll migrations applied successfully.\n');
