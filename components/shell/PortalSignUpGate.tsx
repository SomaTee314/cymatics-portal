'use client';

import Link from 'next/link';

const REDIRECT = '/';

/**
 * Blocks the cymatics iframe until the user signs in. Shell chrome (banner, account)
 * stays above at higher z-index.
 */
export function PortalSignUpGate() {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[90] flex items-center justify-center bg-[#030508]/92 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-gate-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 p-8 text-center shadow-2xl">
        <h2
          id="portal-gate-title"
          className="text-balance text-xl font-semibold tracking-tight text-white"
        >
          Create a free account to use the full portal
        </h2>
        <p className="mt-3 text-balance text-sm text-white/65">
          7-day Pro trial — full access to every preset, mic input, and visual mode. No
          charge until the trial ends; cancel anytime.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/signup?redirect=${encodeURIComponent(REDIRECT)}`}
            prefetch={false}
            className="inline-flex justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white/90"
          >
            Sign up free
          </Link>
          <Link
            href={`/login?redirect=${encodeURIComponent(REDIRECT)}`}
            prefetch={false}
            className="inline-flex justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
