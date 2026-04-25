import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/supabase/public-env';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getPublicSupabaseUrl(),
    getPublicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* Server Component / read-only */
          }
        },
      },
    }
  );
}
