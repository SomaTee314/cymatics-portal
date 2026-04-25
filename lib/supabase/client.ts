import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseAnonKey, getPublicSupabaseUrl } from '@/lib/supabase/public-env';

export function createClient() {
  return createBrowserClient(getPublicSupabaseUrl(), getPublicSupabaseAnonKey());
}
