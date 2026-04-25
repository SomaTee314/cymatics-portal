/**
 * Smoke test: Polar SDK can create a checkout (uses same shape as app/api/checkout/route.ts).
 * Run: node scripts/test-polar-checkout.mjs
 *
 * Loads .env.local with override (see scripts/test-supabase.mjs).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Polar, ServerProduction, ServerSandbox } from '@polar-sh/sdk';

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

const accessToken = process.env.POLAR_ACCESS_TOKEN;
const productId =
  process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID ||
  process.env.TEST_POLAR_PRODUCT_ID;

if (!accessToken || !productId) {
  console.error(
    'Need POLAR_ACCESS_TOKEN and NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID (or TEST_POLAR_PRODUCT_ID) in .env.local',
  );
  process.exit(1);
}

const envServer = process.env.POLAR_SERVER;
const server =
  envServer === 'sandbox'
    ? ServerSandbox
    : envServer === 'production'
      ? ServerProduction
      : undefined;

const polar = new Polar(
  server !== undefined ? { accessToken, server } : { accessToken },
);

const checkout = await polar.checkouts.create({
  products: [productId],
  successUrl: 'http://localhost:3000/checkout/success',
  returnUrl: 'http://localhost:3000/pricing',
  metadata: { supabase_user_id: 'test-smoke-user' },
  customerEmail: 'polar-smoke-test@example.com',
  externalCustomerId: 'test-smoke-user',
});

if (!checkout?.url) {
  console.error('No checkout URL in response');
  process.exit(1);
}

console.log('OK: checkout session created');
console.log('url:', checkout.url);
