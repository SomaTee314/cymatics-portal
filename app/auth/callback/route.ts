import { sanitizeAuthNextPath } from '@/lib/auth/auth-redirect';
import { requestPublicOrigin } from '@/lib/auth/request-url';
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/supabase/public-env';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

function authFailedReason(
  err: { message?: string; code?: string } | null
): 'pkce' | 'expired' | 'exchange' {
  if (!err) return 'exchange';
  const m = (err.message || '').toLowerCase();
  if (
    m.includes('verifier') ||
    m.includes('flow state') ||
    m.includes('code verifier') ||
    m.includes('both auth code')
  ) {
    return 'pkce';
  }
  if (m.includes('expired') || m.includes('invalid')) {
    return 'expired';
  }
  return 'exchange';
}

function authFailedRedirect(
  origin: string,
  reason: string,
  from: string | null,
  nextPath: string
) {
  const base = from === 'signup' ? '/signup' : '/login';
  const u = new URL(base, origin);
  u.searchParams.set('error', 'auth_failed');
  u.searchParams.set('reason', reason);
  if (nextPath && nextPath !== '/') {
    u.searchParams.set('redirect', nextPath);
  }
  return NextResponse.redirect(u);
}

export async function GET(request: NextRequest) {
  const origin = requestPublicOrigin(request);
  const code = request.nextUrl.searchParams.get('code');
  const next = sanitizeAuthNextPath(request.nextUrl.searchParams.get('next'));
  const from = request.nextUrl.searchParams.get('from');

  if (!code) {
    return authFailedRedirect(origin, 'missing_code', from, next);
  }

  const finalDestination =
    from === 'signup'
      ? (() => {
          const u = new URL('/signup/set-password', origin);
          u.searchParams.set('redirect', next);
          return u;
        })()
      : new URL(next.startsWith('/') ? next : `/${next}`, origin);
  const response = NextResponse.redirect(finalDestination);

  const supabase = createServerClient(
    getPublicSupabaseUrl(),
    getPublicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const reason = authFailedReason(error);
    return authFailedRedirect(origin, reason, from, next);
  }

  return response;
}
