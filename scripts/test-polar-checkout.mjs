/**
 * Smoke test: Polar SDK can create a checkout (uses same shape as app/api/checkout/route.ts).
 * Run: node scripts/test-polar-checkout.mjs
 *
 * Loads .env.sh (or .env.local) — see scripts/load-env-local.mjs.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { Polar, ServerProduction, ServerSandbox } from '@polar-sh/sdk';
import { loadProjectEnv } from './load-env-local.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

loadProjectEnv(root);

const accessToken = process.env.POLAR_ACCESS_TOKEN;
const productId =
  process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID ||
  process.env.TEST_POLAR_PRODUCT_ID;

if (!accessToken || !productId) {
  console.error(
    'Need POLAR_ACCESS_TOKEN and NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID (or TEST_POLAR_PRODUCT_ID) in .env.sh (or .env.local)',
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
