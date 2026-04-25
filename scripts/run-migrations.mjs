/**
 * Applies sql/*.sql to the remote Supabase database.
 *
 * Prerequisites (pick one):
 *   A) Easiest: SUPABASE_DB_PASSWORD in .env.local (Project Settings → Database: Postgres password) +
 *        NEXT_PUBLIC_SUPABASE_URL. This script builds the pooler URI (port 6543, transaction mode).
 *        Optional: SUPABASE_POOLER_REGION if not us-east-1.
 *   B) Or paste SUPABASE_DB_URL: Dashboard → Connect → choose "Direct" (Connection string) →
 *        pick a Postgres URI (Transaction pooler is port 6543, or use Direct/Session as shown there).
 *   C) npx supabase login && npx supabase link --project-ref <ref> -p <db_password>
 *      then: node scripts/run-migrations.mjs
 *
 * CLI v2 uses `supabase db query`, not `db execute`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import pg from 'pg';
import { loadEnvLocal } from './load-env-local.mjs';
import {
  getPostgresUrlForMigrations,
  isPasswordOnlyMigrationsUrl,
  projectRefFromUrl,
} from './migrations-pg-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

loadEnvLocal(root);

const FILES = ['sql/000_run_first_all_schema.sql'];

const dbUrl = getPostgresUrlForMigrations();
const ref = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const usingPasswordOnly = isPasswordOnlyMigrationsUrl();

function printManual() {
  console.error(
    '\nCould not apply migrations automatically. Set SUPABASE_DB_PASSWORD or SUPABASE_DB_URL in .env.local, or paste the SQL into the Supabase SQL Editor (SQL → New query → Run).\n',
  );
  for (const rel of FILES) {
    const fp = path.join(root, rel);
    console.log('\n' + '='.repeat(72));
    console.log(`-- ${rel}`);
    console.log('='.repeat(72) + '\n');
    console.log(fs.readFileSync(fp, 'utf8'));
  }
}

console.log(
  'Project ref (from NEXT_PUBLIC_SUPABASE_URL):',
  ref || '(use a real https://xxxxx.supabase.co URL)',
);

async function runWithPg() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const rel of FILES) {
      const filePath = path.join(root, rel);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`\n→ ${rel}`);
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
  console.log('\nAll migrations applied successfully.\n');
}

if (dbUrl) {
  if (usingPasswordOnly) {
    const reg = (process.env.SUPABASE_POOLER_REGION || 'us-east-1').trim();
    console.log(
      `Using SUPABASE_DB_PASSWORD + pooler (transaction mode, :6543, aws-0-${reg}.pooler.supabase.com).\n`,
    );
  } else {
    console.log('Using SUPABASE_DB_URL / DATABASE_URL with direct Postgres (pg module).\n');
  }
  runWithPg().catch((err) => {
    console.error(err);
    printManual();
    process.exit(1);
  });
} else {
  console.log(
    'No Postgres connection for migrations. API keys (anon / service_role) do not run SQL; ' +
      'use the database password or a Postgres URI.\n' +
      '  • Best: set SUPABASE_DB_PASSWORD (Project Settings → Database) + NEXT_PUBLIC_SUPABASE_URL.\n' +
      '  • Or: copy a URI from Project → Connect → Direct → choose connection string type (e.g. Transaction / Direct).\n' +
      '  • Or: npx supabase login && npx supabase link --project-ref',
    ref || '<your-ref>',
    '-p <db_password>\n' +
      'Then: npm run migrate (or npx supabase db push).\n',
  );

  let failed = false;
  for (const rel of FILES) {
    const filePath = path.join(root, rel);
    const args = ['supabase', 'db', 'query', '-f', filePath, '--linked'];
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
}
