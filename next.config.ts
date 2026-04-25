import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node resolves .mjs at config load time
import { loadProjectEnv } from './scripts/load-env-local.mjs';

/** Absolute project root — required when a parent folder (e.g. C:\\Users\\you) has its own package-lock.json */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

/** Runs after Next merges default `.env*`; overlays `.env.sh` (or `.env.local`) so values in that file win. */
loadProjectEnv(projectRoot);

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
