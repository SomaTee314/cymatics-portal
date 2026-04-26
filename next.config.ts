import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node resolves .mjs at config load time
import { loadProjectEnv } from './scripts/load-env-local.mjs';

/** Absolute project root — required when a parent folder (e.g. C:\\Users\\you) has its own package-lock.json */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

/** Runs after Next merges default `.env*`; overlays `.env.sh` (or `.env.local`) so values in that file win. */
loadProjectEnv(projectRoot);

const vercelProdBlock =
  process.env.VERCEL === '1' &&
  process.env.VERCEL_ENV === 'production' &&
  process.env.NEXT_PUBLIC_DEV_MODE === 'true';
if (vercelProdBlock) {
  throw new Error(
    'Vercel Production build blocked: NEXT_PUBLIC_DEV_MODE is "true". All visitors would see the dev mock ' +
      'user (e.g. dev@cymaticsportal.local) instead of real sign-in. In Vercel → Settings → ' +
      'Environment Variables, set NEXT_PUBLIC_DEV_MODE to false for Production (or remove it), ' +
      'then redeploy. See .env.example ("Dev bypass").'
  );
}
if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_DEV_MODE === 'true' &&
  !vercelProdBlock
) {
  // Still allow `next build` locally when .env has dev unlock; warn so a mis-uploaded bundle is less likely.
  // eslint-disable-next-line no-console -- intentional install-time notice
  console.warn(
    '[next.config] NEXT_PUBLIC_DEV_MODE is true with NODE_ENV=production. Do not deploy this ' +
      'build to a public site; set NEXT_PUBLIC_DEV_MODE=false for production-like bundles.'
  );
}

/**
 * Local/monorepo: lock tracing to this repo when a parent folder has another package-lock.json.
 * Omit on Vercel — a custom tracing root can break the serverless bundle and yield opaque 500s.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(!process.env.VERCEL ? { outputFileTracingRoot: projectRoot } : {}),
  /**
   * Baked at build time so the cymatics iframe URL changes on every Vercel deploy
   * (browsers/edges otherwise cache /cymatics.html and the shell looks "stale").
   */
  env: {
    NEXT_PUBLIC_ASSET_BUST:
      process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || '',
  },
  async headers() {
    return [
      {
        source: '/cymatics.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/landing/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/vendor/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
