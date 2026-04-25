/**
 * Pushes Supabase env vars from `.env.sh` (or `.env.local`) to Vercel (production + all preview) via REST API.
 * Requires: VERCEL_TOKEN in `.env.sh` and a linked .vercel/project.json.
 * Run: node scripts/sync-vercel-supabase-env.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadProjectEnv } from './load-env-local.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

loadProjectEnv(root);
if (!fs.existsSync(path.join(root, '.env.sh')) && !fs.existsSync(path.join(root, '.env.local'))) {
  console.error('Missing .env.sh (or .env.local as fallback).');
  process.exit(1);
}

const keys = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', sensitive: false },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', sensitive: false },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', sensitive: true },
];

const vercelToken = process.env.VERCEL_TOKEN;
const projectJson = path.join(root, '.vercel', 'project.json');
if (!vercelToken) {
  console.log(
    'No VERCEL_TOKEN in .env.sh — skipping API sync. Create a token: https://vercel.com/account/tokens\n' +
      'Add VERCEL_TOKEN=... to .env.sh and run: npm run vercel:env:supabase\n' +
      'Or in Vercel → Settings → Environment Variables, add (Production + Preview, all preview branches):\n' +
      keys.map((k) => '  ' + k.name).join('\n') +
      '\n'
  );
  process.exit(0);
}
if (!fs.existsSync(projectJson)) {
  console.error('Missing .vercel/project.json — run: npx vercel link');
  process.exit(1);
}

const { projectId, orgId: teamId } = JSON.parse(fs.readFileSync(projectJson, 'utf8'));

for (const { name, sensitive } of keys) {
  const v = process.env[name];
  if (!v || v.includes('your-project') || v.includes('your_')) {
    console.error(`Missing or placeholder ${name} in .env.sh / .env.local`);
    process.exit(1);
  }
  const valueType = sensitive ? 'sensitive' : 'encrypted';
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
      key: name,
      value: v,
      type: valueType,
      target: ['production', 'preview'],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`Vercel API error for ${name}:`, res.status, t);
    process.exit(1);
  }
  console.log(`OK: ${name} (production + preview)`);
}

console.log(
  '\nRun: npx vercel --prod\nto redeploy so `NEXT_PUBLIC_*` is baked into the build.\n'
);
