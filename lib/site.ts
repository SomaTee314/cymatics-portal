/**
 * Canonical site URL for metadata, sitemap, and robots.
 * Optional override: NEXT_PUBLIC_SITE_URL in Vercel (e.g. if primary domain changes).
 */
const PRODUCTION_CANONICAL = 'https://www.cymaticsportal.com';

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_CANONICAL;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`;
  }
  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();
