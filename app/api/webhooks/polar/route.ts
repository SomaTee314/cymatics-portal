import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SDKValidationError } from '@polar-sh/sdk/models/errors/sdkvalidationerror';
import {
  validateEvent,
  WebhookVerificationError,
} from '@polar-sh/sdk/webhooks';
import { getPublicSupabaseUrl } from '@/lib/supabase/public-env';

const supabaseAdmin = () =>
  createClient(
    getPublicSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

function headersToRecord(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function metaUserId(
  metadata: Record<string, string | number | boolean> | undefined,
): string | undefined {
  if (!metadata) return undefined;
  const v = metadata.supabase_user_id;
  if (v === undefined || v === null) return undefined;
  return String(v);
}

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

/** Polar JSON may use ISO strings; verified SDK payloads use Date */
function periodEndToIso(value: Date | string | undefined | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

type PolarWebhookEvent = ReturnType<typeof validateEvent>;

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Polar webhook: SUPABASE_SERVICE_ROLE_KEY not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const secret = process.env.POLAR_WEBHOOK_SECRET ?? '';
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !secret.trim()) {
    console.error('Polar webhook: POLAR_WEBHOOK_SECRET required in production');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  let event: PolarWebhookEvent;

  if (secret.trim()) {
    try {
      event = validateEvent(rawBody, headersToRecord(req.headers), secret);
    } catch (e) {
      if (e instanceof WebhookVerificationError) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
      if (e instanceof SDKValidationError) {
        console.warn('Polar webhook: could not parse event', e.message);
        return NextResponse.json({ received: true });
      }
      console.error('Polar webhook: unexpected error', e);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
  } else {
    console.warn(
      'Polar webhook: POLAR_WEBHOOK_SECRET unset — skipping signature verification (dev only)',
    );
    try {
      event = JSON.parse(rawBody) as PolarWebhookEvent;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  }

  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated': {
      const sub = event.data as {
        id: string;
        productId?: string;
        product_id?: string;
        status: unknown;
        metadata?: Record<string, string | number | boolean>;
        currentPeriodEnd?: Date | string;
        current_period_end?: string;
      };
      const userId = metaUserId(sub.metadata);
      if (!userId) {
        console.warn('Polar webhook: missing supabase_user_id');
        return NextResponse.json({ received: true });
      }
      const productId = String(sub.productId ?? sub.product_id ?? '');
      const tier = determineTier(productId);
      await sb
        .from('profiles')
        .update({
          tier,
          subscription_id: sub.id,
          subscription_status: String(sub.status ?? 'active'),
          current_period_end: periodEndToIso(
            sub.currentPeriodEnd ?? sub.current_period_end,
          ),
          updated_at: now,
        })
        .eq('id', userId);
      break;
    }

    case 'subscription.canceled': {
      const sub = event.data as {
        metadata?: Record<string, string | number | boolean>;
      };
      const userId = metaUserId(sub.metadata);
      if (!userId) {
        console.warn('Polar webhook: subscription.canceled missing supabase_user_id');
        return NextResponse.json({ received: true });
      }
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

    case 'order.paid': {
      const order = event.data as {
        productId?: string | null;
        product_id?: string | null;
        metadata?: Record<string, string | number | boolean>;
      };
      const userId = metaUserId(order.metadata);
      if (!userId) {
        console.warn('Polar webhook: order.paid missing supabase_user_id');
        return NextResponse.json({ received: true });
      }
      const productId = String(order.productId ?? order.product_id ?? '');
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
