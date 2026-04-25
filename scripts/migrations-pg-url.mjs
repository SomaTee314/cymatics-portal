/**
 * Resolves the Postgres connection string for `npm run migrate` and DB smoke tests.
 * After `loadProjectEnv` (`.env.sh` / `.env.local`), reads `SUPABASE_DB_URL` / `DATABASE_URL` or builds pooler URI from
 * `SUPABASE_DB_PASSWORD` + `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_POOLER_REGION`.
 */

/**
 * @param {string | undefined} url
 * @returns {string | null}
 */
export function projectRefFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const host = new URL(url).hostname;
    if (host.endsWith('.supabase.co')) {
      return host.slice(0, -'.supabase.co'.length);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @returns {string | null}
 */
export function buildPoolerUrlFromPassword() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password?.trim()) return null;
  const ref = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!ref) {
    console.error(
      'SUPABASE_DB_PASSWORD is set but NEXT_PUBLIC_SUPABASE_URL is missing or invalid (need *.supabase.co for auto pooler host).',
    );
    return null;
  }
  const region = (process.env.SUPABASE_POOLER_REGION || 'us-east-1').trim();
  const host = `aws-0-${region}.pooler.supabase.com`;
  const user = `postgres.${ref}`;
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:6543/postgres`;
}

/**
 * @returns {string | null}
 */
export function getPostgresUrlForMigrations() {
  const a = (process.env.SUPABASE_DB_URL || '').trim();
  if (a) return a;
  const b = (process.env.DATABASE_URL || '').trim();
  if (b) return b;
  return buildPoolerUrlFromPassword();
}

/**
 * @returns {boolean} True when the URL is only built from password + public URL, not a raw URI
 */
export function isPasswordOnlyMigrationsUrl() {
  const hasExplicit = Boolean(
    (process.env.SUPABASE_DB_URL || '').trim() ||
      (process.env.DATABASE_URL || '').trim(),
  );
  if (hasExplicit) return false;
  return Boolean(buildPoolerUrlFromPassword());
}
