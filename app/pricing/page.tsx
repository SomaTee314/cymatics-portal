'use client';

import { useUser } from '@/context/UserContext';
import { useState } from 'react';

const PRO_MONTHLY = process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID ?? '';
const PRO_YEARLY = process.env.NEXT_PUBLIC_POLAR_PRO_YEARLY_PRODUCT_ID || PRO_MONTHLY;
const CREATOR_MONTHLY = process.env.NEXT_PUBLIC_POLAR_CREATOR_PRODUCT_ID ?? '';
const CREATOR_YEARLY =
  process.env.NEXT_PUBLIC_POLAR_CREATOR_YEARLY_PRODUCT_ID || CREATOR_MONTHLY;
const LIFETIME = process.env.NEXT_PUBLIC_POLAR_LIFETIME_PRODUCT_ID ?? '';

const PLANS = [
  {
    id: 'pro',
    name: 'Resonator',
    subtitle: 'Pro',
    monthlyPrice: '£7.77',
    yearlyPrice: '£59',
    features: [
      'All Chladni & Solfeggio presets',
      'All visual modes',
      'Unlimited sessions',
      'Track upload & FFT',
      'Custom frequency dial',
      'Hi-res export (no watermark)',
      'Save configurations',
    ],
    productIdMonthly: PRO_MONTHLY,
    productIdYearly: PRO_YEARLY,
  },
  {
    id: 'creator',
    name: 'Architect',
    subtitle: 'Creator',
    monthlyPrice: '£14.44',
    yearlyPrice: '£129',
    features: [
      'Everything in Pro',
      'Video / GIF export',
      '4K resolution',
      'Custom palettes',
      'Embeddable widget',
      'API access',
      'Commercial licence',
    ],
    productIdMonthly: CREATOR_MONTHLY,
    productIdYearly: CREATOR_YEARLY,
    highlighted: true,
  },
];

export default function PricingPage() {
  const { effectiveTier, isAuthenticated, signOut } = useUser();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (productId: string) => {
    if (!productId) {
      alert('Add Polar product IDs to environment variables.');
      return;
    }
    if (!isAuthenticated) {
      window.location.href = '/signup?redirect=/pricing';
      return;
    }

    setLoading(productId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else console.error(data);
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 py-20 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="mb-6 flex flex-wrap items-center justify-center gap-4 text-center">
          <a href="/" className="text-sm text-white/50 hover:text-white">
            ← Back to app
          </a>
          {isAuthenticated ? (
            <button
              type="button"
              data-testid="logout"
              onClick={() => void signOut()}
              className="text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              Sign out
            </button>
          ) : null}
        </p>
        <h1 className="mb-3 text-center text-4xl font-bold">Choose your frequency</h1>
        <p className="mb-10 text-center text-lg text-white/50">
          Unlock the full spectrum of cymatics visualisation
        </p>

        <div className="mb-12 flex justify-center">
          <div className="flex rounded-full bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded-full px-5 py-2 text-sm transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('yearly')}
              className={`rounded-full px-5 py-2 text-sm transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isCurrent =
              (plan.id === 'pro' && (effectiveTier === 'pro' || effectiveTier === 'lifetime')) ||
              (plan.id === 'creator' && effectiveTier === 'creator');
            const productId =
              billingPeriod === 'yearly' ? plan.productIdYearly : plan.productIdMonthly;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-8 ${
                  'highlighted' in plan && plan.highlighted
                    ? 'border-indigo-500/50 bg-indigo-500/5'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="mb-1 text-xs uppercase tracking-widest text-white/40">
                  {plan.subtitle}
                </div>
                <h2 className="mb-1 text-2xl font-bold">{plan.name}</h2>
                <div className="mb-6">
                  <span className="text-3xl font-bold">
                    {billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="ml-1 text-sm text-white/40">
                    /{billingPeriod === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-white/70">
                      <span className="mt-0.5 text-green-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleCheckout(productId)}
                  disabled={isCurrent || loading === productId}
                  className={`w-full rounded-xl py-3 text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'cursor-not-allowed bg-white/10 text-white/40'
                      : 'highlighted' in plan && plan.highlighted
                        ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                        : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {isCurrent
                    ? 'Current plan'
                    : loading === productId
                      ? 'Loading…'
                      : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="mb-2 text-xs uppercase tracking-widest text-amber-400/80">
            Founding supporters
          </div>
          <h3 className="mb-2 text-xl font-bold">Lifetime Resonator — £144</h3>
          <p className="mb-4 text-sm text-white/40">
            One-time payment. Pro tier, forever. Limited founding release.
          </p>
          <button
            type="button"
            onClick={() => handleCheckout(LIFETIME)}
            className="rounded-xl bg-amber-500 px-8 py-3 text-sm font-medium text-black hover:bg-amber-400"
          >
            Claim lifetime
          </button>
        </div>
      </div>
    </div>
  );
}
