/* Missing NEXT_PUBLIC Supabase vars would throw in UserProvider SSR and 500 every route. */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

let warnedMissing = false;

function warnOnce() {
  if (warnedMissing) return;
  warnedMissing = true;
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing — using placeholders. Set them for auth and profiles.',
  );
}

function trimmed(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t || undefined;
}

export function getPublicSupabaseUrl(): string {
  const v = trimmed(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!v) warnOnce();
  return v || PLACEHOLDER_URL;
}

export function getPublicSupabaseAnonKey(): string {
  const v = trimmed(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!v) warnOnce();
  return v || PLACEHOLDER_ANON_KEY;
}

export function isSupabasePublicConfigured(): boolean {
  return Boolean(
    trimmed(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      trimmed(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
