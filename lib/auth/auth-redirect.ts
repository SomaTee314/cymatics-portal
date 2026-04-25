/**
 * Safe path after magic-link auth. Only same-origin relative paths are allowed.
 */
export function sanitizeAuthNextPath(path: string | null | undefined): string {
  if (!path) return '/';
  const t = path.trim();
  if (!t) return '/';
  const p = t.startsWith('/') ? t : `/${t}`;
  if (p.startsWith('//') || p.includes('://') || p.includes('\\')) return '/';
  return p;
}

/** `redirect` or `next` query param from /login or /signup → default post-auth path */
export function authNextFromSearchParam(
  redirect: string | null,
  next: string | null,
): string {
  return sanitizeAuthNextPath(redirect ?? next);
}

/** `from` controls where auth callback errors are redirected (login vs sign-up). */
export function authCallbackAbsoluteUrl(
  origin: string,
  nextPath: string,
  from?: 'login' | 'signup',
): string {
  const u = new URL('/auth/callback', origin);
  u.searchParams.set('next', sanitizeAuthNextPath(nextPath));
  if (from) u.searchParams.set('from', from);
  return u.toString();
}
