/**
 * Tries a short Postgres connect + SELECT 1 using the same env as `npm run migrate`.
 * Does not print passwords or full URIs.
 *
 * Run: node scripts/test-postgres-connection.mjs  or  npm run test:db
 */
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { loadEnvLocal } from './load-env-local.mjs';
import { getPostgresUrlForMigrations, isPasswordOnlyMigrationsUrl } from './migrations-pg-url.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

loadEnvLocal(root);

const dbUrl = getPostgresUrlForMigrations();

function safeEndpoint(connectionString) {
  try {
    const u = new URL(connectionString.replace(/^postgresql:\/\//i, 'http://'));
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return '(unparsed)';
  }
}

if (!dbUrl) {
  console.error(
    'No Postgres URL for migrations. Set in .env.local (uncommented):\n' +
      '  • SUPABASE_DB_URL=...  (from Connect → Direct), or\n' +
      '  • SUPABASE_DB_PASSWORD=... + NEXT_PUBLIC_SUPABASE_URL=...  (and SUPABASE_POOLER_REGION if not us-east-1)',
  );
  process.exit(1);
}

if (isPasswordOnlyMigrationsUrl()) {
  const reg = (process.env.SUPABASE_POOLER_REGION || 'us-east-1').trim();
  console.log(
    `Using built pooler URI (transaction, port 6543, region ${reg}) — not printing credentials.`,
  );
} else {
  console.log(`Target endpoint (from URI): ${safeEndpoint(dbUrl)}`);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  await client.query('SELECT 1 as ok');
  await client.end();
  console.log('Postgres: OK (SELECT 1 succeeded).');
} catch (e) {
  const err = e instanceof Error ? e : new Error(String(e));
  const code = /** @type {{ code?: string }} */ (e).code;
  const msg = err.message || '';

  if (code === '28P01' || /password authentication failed/i.test(msg)) {
    console.error(
      'Postgres: failed — wrong user/password, or you used an API key instead of the **database** password.\n' +
        '  Use: Project Settings → Database password (or the URI from Connect → Direct).',
    );
  } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    console.error('Postgres: failed — host not found (check SUPABASE_POOLER_REGION or URI host).', code);
  } else if (code === 'ETIMEDOUT' || /timeout/i.test(msg)) {
    console.error(
      'Postgres: failed — connection timed out (VPN/firewall, or wrong region on pooler; try Session pooler or Direct in dashboard).',
    );
  } else if (code === 'ECONNREFUSED') {
    console.error('Postgres: failed — connection refused (wrong port? Direct=5432, transaction pooler=6543).', code);
  } else {
    console.error('Postgres: failed —', code || 'ERR', err.message);
  }
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
}
