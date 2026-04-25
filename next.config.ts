import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

/** Absolute project root — required when a parent folder (e.g. C:\\Users\\you) has its own package-lock.json */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

/**
 * Local/monorepo: lock tracing to this repo when a parent folder has another package-lock.json.
 * Omit on Vercel — a custom tracing root can break the serverless bundle and yield opaque 500s.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(!process.env.VERCEL ? { outputFileTracingRoot: projectRoot } : {}),
};

export default nextConfig;
