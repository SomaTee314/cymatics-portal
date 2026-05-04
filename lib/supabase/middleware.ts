import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/supabase/public-env';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on each request so SSR and the route handler
 * (e.g. /auth/callback) see a consistent cookie story on Vercel.
 *
 * Use `getUser()` (not `getSession`) here: per Supabase SSR guidance, `getUser`
 * triggers token refresh and cookie writes; `getSession` alone can leave the
 * server session out of sync after password sign-in, breaking `router.refresh`.
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getPublicSupabaseUrl(),
    getPublicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}
