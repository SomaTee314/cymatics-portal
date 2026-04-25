import type { NextRequest } from 'next/server';

/**
 * Public origin for redirects (Vercel/proxies set x-forwarded-*).
 * Prefer over `new URL(request.url).origin` when the edge reports a public host.
 */
export function requestPublicOrigin(request: NextRequest): string {
  const url = new URL(request.url);
  const host = request.headers
    .get('x-forwarded-host')
    ?.split(',')
    [0]
    ?.trim();
  const proto =
    request.headers
      .get('x-forwarded-proto')
      ?.split(',')
      [0]
      ?.trim() || (url.protocol === 'https:' ? 'https' : 'http');
  if (host) {
    return `${proto}://${host}`;
  }
  return url.origin;
}
