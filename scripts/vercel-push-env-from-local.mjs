/**
 * Pushes app env vars from .env.local to the linked Vercel project
 * (production + preview) via the Vercel REST API. Avoids the Windows bug where
 * `vercel env add` can hang after a successful save.
 *
 * Requires: VERCEL_TOKEN in .env.local (https://vercel.com/account/tokens) and
 *           `.vercel/project.json` (from `npx vercel link`).
 *
 * Run: node scripts/vercel-push-env-from-local.mjs
 *      or: npm run vercel:push:env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const projectJson = path.join(root, '.vercel', 'project.json');

function loadEnvLocal() {
  const p = path.join(root, '.env.local');
  if (!fs.existsSync(p)) {
    console.error('Missing .env.local');
    process.exit(1);
  }
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function isMissing(v) {
  if (v === undefined || v === null) return true;
  if (String(v).trim() === '') return true;
  return false;
}

loadEnvLocal();

const vercelToken = process.env.VERCEL_TOKEN;
if (!vercelToken) {
  console.error(
    'VERCEL_TOKEN is not set in .env.local.\n' +
      'Create a token: https://vercel.com/account/tokens\n' +
      'Add a line: VERCEL_TOKEN=...\n' +
      'Then run: npm run vercel:push:env\n',
  );
  process.exit(1);
}

if (!fs.existsSync(projectJson)) {
  console.error(
    'Missing .vercel/project.json — run: npx vercel link --yes --project cymatics-portal --scope <team>\n',
  );
  process.exit(1);
}

const { projectId, orgId: teamId } = JSON.parse(fs.readFileSync(projectJson, 'utf8'));

const sensitiveKeys = new Set([
  'SUPABASE_SERVICE_ROLE_KEY',
  'POLAR_ACCESS_TOKEN',
  'POLAR_WEBHOOK_SECRET',
]);

/**
 * @typedef {{ key: string, value?: string }} EnvSpec
 * If `value` is set, it overrides .env.local (e.g. force DEV_MODE off in Vercel).
 * After subscriptions go live, set `NEXT_PUBLIC_SUBSCRIPTION_PAUSED` to `false` (or remove the override).
 */
const spec = /** @type {EnvSpec[]} */ ([
  { key: 'NEXT_PUBLIC_SUPABASE_URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY' },
  { key: 'POLAR_ACCESS_TOKEN' },
  { key: 'POLAR_WEBHOOK_SECRET' },
  { key: 'POLAR_ORGANIZATION_ID' },
  { key: 'NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID' },
  { key: 'NEXT_PUBLIC_POLAR_PRO_YEARLY_PRODUCT_ID' },
  { key: 'NEXT_PUBLIC_POLAR_CREATOR_PRODUCT_ID' },
  { key: 'NEXT_PUBLIC_POLAR_CREATOR_YEARLY_PRODUCT_ID' },
  { key: 'NEXT_PUBLIC_POLAR_LIFETIME_PRODUCT_ID' },
  { key: 'NEXT_PUBLIC_DEV_MODE', value: 'false' },
  { key: 'NEXT_PUBLIC_SUBSCRIPTION_PAUSED', value: 'true' },
]);

for (const { key, value: override } of spec) {
  const v = override !== undefined ? String(override) : (process.env[key] ?? '');
  if (isMissing(v)) {
    console.warn(`Skip ${key} (not in .env.local or empty)`);
    continue;
  }
  const valueType = sensitiveKeys.has(key) ? 'sensitive' : 'encrypted';
  const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/env`);
  url.searchParams.set('upsert', 'true');
  if (teamId) url.searchParams.set('teamId', teamId);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      value: v,
      type: valueType,
      target: ['production', 'preview'],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`Vercel API error for ${key}:`, res.status, t);
    process.exit(1);
  }
  console.log(`OK  ${key} (production + preview)`);
}

console.log(
  '\nRedeploy production: npx vercel --prod --yes\n' +
    '(`NEXT_PUBLIC_*` and billing IDs are applied at build time.)\n',
);
