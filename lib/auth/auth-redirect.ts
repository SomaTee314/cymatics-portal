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

export function authCallbackAbsoluteUrl(origin: string, nextPath: string): string {
  const u = new URL('/auth/callback', origin);
  u.searchParams.set('next', sanitizeAuthNextPath(nextPath));
  return u.toString();
}
