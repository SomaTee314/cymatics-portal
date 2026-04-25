'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@/context/UserContext';
import type { UserTier } from '@/lib/tiers';

const SHELL_Z = 'z-[96]';

function tierDisplay(
  storedTier: UserTier | undefined,
  effectiveTier: UserTier,
  isTrialActive: boolean
): { label: string; className: string } {
  if (storedTier === 'trial' && isTrialActive) {
    return {
      label: 'Pro Trial',
      className: 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-400/30',
    };
  }
  switch (effectiveTier) {
    case 'trial':
      return {
        label: 'Pro Trial',
        className: 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-400/30',
      };
    case 'pro':
      return {
        label: 'Pro',
        className: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/25',
      };
    case 'creator':
      return {
        label: 'Creator',
        className: 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/25',
      };
    case 'lifetime':
      return {
        label: 'Lifetime',
        className: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30',
      };
    default:
      return {
        label: 'Free',
        className: 'bg-white/10 text-white/60 ring-1 ring-white/15',
      };
  }
}

function truncateEmail(email: string, max = 28) {
  if (email.length <= max) return email;
  return `${email.slice(0, max - 3)}…`;
}

type AccountMenuProps = {
  /** Anonymous “Sign up” is hidden until the iframe reaches the main portal (3rd step). */
  showAnonymousSignup?: boolean;
};

export function AccountMenu({ showAnonymousSignup = true }: AccountMenuProps) {
  const {
    isDevMode,
    isAuthenticated,
    user,
    effectiveTier,
    isTrialActive,
    trialDaysLeft,
    signOut,
  } = useUser();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const onSignOut = async () => {
    close();
    await signOut();
    window.location.href = '/';
  };

  if (isDevMode) {
    return (
      <div
        className={`fixed top-4 right-4 ${SHELL_Z} flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-2 sm:flex-nowrap`}
        title="Dev unlock: mock Creator user + full iframe access (default in next dev, or NEXT_PUBLIC_DEV_MODE=true). Set DEV_MODE=false and FORCE_SUBSCRIPTION_GATES=true to test free tier."
      >
        <span className="select-none rounded-md border border-amber-500/40 bg-amber-950/90 px-2 py-1 text-xs font-semibold tracking-wide text-amber-200">
          DEV MODE
        </span>
        <Link
          href="/login"
          prefetch={false}
          className="inline-flex rounded-full border border-white/15 bg-black/80 px-3 py-1.5 text-xs font-medium text-white/80 shadow-lg transition-colors hover:border-white/25 hover:bg-black/90 hover:text-white"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          prefetch={false}
          className="inline-flex rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-black/85 hover:text-white/90"
        >
          Sign up
        </Link>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (!showAnonymousSignup) {
      return null;
    }
    return (
      <div className={`fixed top-4 right-4 ${SHELL_Z}`}>
        <Link
          href="/signup"
          prefetch={false}
          className="inline-flex rounded-full border border-white/10 bg-black/75 px-4 py-1.5 text-sm text-white/70 transition-colors hover:bg-black/85 hover:text-white/90"
        >
          Sign Up — Free Trial
        </Link>
      </div>
    );
  }

  const email = user.email ?? '';
  const letter = (email[0] ?? '?').toUpperCase();
  const { label, className } = tierDisplay(
    user.tier,
    effectiveTier,
    isTrialActive
  );

  return (
    <div ref={rootRef} className={`fixed top-4 right-4 ${SHELL_Z}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/80 text-sm font-medium text-white shadow-lg transition-colors hover:bg-black/90"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        {letter}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-white/10 bg-zinc-950/98 p-3 shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p className="truncate px-0.5 text-xs text-white/40" title={email || undefined}>
            {email ? truncateEmail(email) : '—'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
            >
              {label}
            </span>
          </div>
          {isTrialActive && trialDaysLeft > 0 ? (
            <p className="mt-2 text-xs text-white/50">
              {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
            </p>
          ) : null}
          <div className="my-3 border-t border-white/10" />
          <Link
            href="/pricing"
            role="menuitem"
            className="block rounded-lg px-2 py-2 text-sm text-white/85 transition-colors hover:bg-white/10"
            onClick={close}
          >
            Manage Subscription
          </Link>
          <button
            type="button"
            role="menuitem"
            className="mt-0.5 w-full rounded-lg px-2 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/10"
            onClick={() => void onSignOut()}
          >
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  );
}
