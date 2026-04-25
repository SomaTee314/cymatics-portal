import { NextRequest, NextResponse } from 'next/server';
import { Polar, ServerProduction, ServerSandbox } from '@polar-sh/sdk';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function polarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN!;
  const envServer = process.env.POLAR_SERVER;
  const server =
    envServer === 'sandbox'
      ? ServerSandbox
      : envServer === 'production'
        ? ServerProduction
        : undefined;
  return new Polar(
    server !== undefined ? { accessToken, server } : { accessToken },
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Polar not configured' }, { status: 501 });
  }

  const polar = polarClient();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const productId = body?.productId as string | undefined;
  const successUrl = body?.successUrl as string | undefined;
  /* Polar CheckoutCreate uses returnUrl (back button), not cancelUrl */
  const returnUrl =
    (body?.returnUrl as string | undefined) ??
    (body?.cancelUrl as string | undefined);

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: successUrl ?? `${req.nextUrl.origin}/checkout/success`,
      ...(returnUrl ? { returnUrl } : {}),
      metadata: { supabase_user_id: user.id },
      customerEmail: user.email ?? undefined,
      externalCustomerId: user.id,
    });

    const url = checkout.url;
    if (!url) {
      return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 });
    }
    return NextResponse.json({ url });
  } catch (e) {
    console.error('Checkout creation failed:', e);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
