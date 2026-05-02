import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/supabase/public-env';

let browserClient: SupabaseClient | null = null;

/**
 * Single browser client so auth state stays consistent (e.g. login vs UserProvider).
 * Server / SSR calls get a fresh instance (no shared `window`).
 */
export function createClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createBrowserClient(getPublicSupabaseUrl(), getPublicSupabaseAnonKey());
  }
  if (!browserClient) {
    browserClient = createBrowserClient(
      getPublicSupabaseUrl(),
      getPublicSupabaseAnonKey(),
    );
  }
  return browserClient;
}
