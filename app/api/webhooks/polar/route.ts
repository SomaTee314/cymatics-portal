import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl } from '@/lib/supabase/public-env';

const supabaseAdmin = () =>
  createClient(
    getPublicSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

function determineTier(productId: string): string {
  if (
    productId === process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID ||
    productId === process.env.NEXT_PUBLIC_POLAR_PRO_YEARLY_PRODUCT_ID
  ) {
    return 'pro';
  }
  if (
    productId === process.env.NEXT_PUBLIC_POLAR_CREATOR_PRODUCT_ID ||
    productId === process.env.NEXT_PUBLIC_POLAR_CREATOR_YEARLY_PRODUCT_ID
  ) {
    return 'creator';
  }
  if (productId === process.env.NEXT_PUBLIC_POLAR_LIFETIME_PRODUCT_ID) {
    return 'lifetime';
  }
  return 'free';
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Polar webhook: SUPABASE_SERVICE_ROLE_KEY not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const raw = await req.text();
  // TODO: verify Svix / Polar signature using POLAR_WEBHOOK_SECRET

  let event: {
    type?: string;
    data?: Record<string, unknown> & {
      id?: string;
      metadata?: { supabase_user_id?: string };
      product_id?: string;
      status?: string;
      current_period_end?: string;
    };
  };

  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userId = event.data?.metadata?.supabase_user_id;
  if (!userId) {
    console.warn('Polar webhook: missing supabase_user_id');
    return NextResponse.json({ received: true });
  }

  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated': {
      const sub = event.data!;
      const productId = String(sub.product_id ?? '');
      const tier = determineTier(productId);
      await sb
        .from('profiles')
        .update({
          tier,
          subscription_id: String(sub.id ?? ''),
          subscription_status: String(sub.status ?? 'active'),
          current_period_end: sub.current_period_end ?? null,
          updated_at: now,
        })
        .eq('id', userId);
      break;
    }

    case 'subscription.canceled': {
      await sb
        .from('profiles')
        .update({
          tier: 'free',
          subscription_status: 'canceled',
          updated_at: now,
        })
        .eq('id', userId);
      break;
    }

    case 'checkout.completed': {
      const data = event.data!;
      const productId = String(data.product_id ?? '');
      if (productId === process.env.NEXT_PUBLIC_POLAR_LIFETIME_PRODUCT_ID) {
        await sb
          .from('profiles')
          .update({
            tier: 'lifetime',
            lifetime_purchased_at: now,
            subscription_status: 'active',
            updated_at: now,
          })
          .eq('id', userId);
      }
      break;
    }

    default:
      console.info('Polar webhook unhandled:', event.type);
  }

  return NextResponse.json({ received: true });
}
