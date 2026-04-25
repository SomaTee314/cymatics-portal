import { NextResponse } from 'next/server';
import { isSupabasePublicConfigured } from '@/lib/supabase/public-env';

export const dynamic = 'force-dynamic';

/** Confirms the Node runtime is up and which env groups are non-empty (no secret values). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabasePublicConfigured: isSupabasePublicConfigured(),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    vercel: Boolean(process.env.VERCEL),
  });
}
