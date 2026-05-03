'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@/context/UserContext';
import type { UserTier } from '@/lib/tiers';

function MenuHamburger({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="12"
      viewBox="0 0 20 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1.5 2h17M1.5 7h17M1.5 12h17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function tierDisplay(
  storedTier: UserTier | undefined,
  effectiveTier: UserTier,
  isTrialActive: boolean
): { label: string; className: string } {
  if (storedTier === 'trial' && isTrialActive) {
    return {
      label: 'Full access',
      className: 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-400/30',
    };
  }
  switch (effectiveTier) {
    case 'trial':
      return {
        label: 'Full access',
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
  /** Anonymous “Sign up” is hidden until the iframe reaches the main portal (step 3). */
  showAnonymousSignup?: boolean;
  /** Parent supplies fixed positioning wrapper; this component is `relative` only. */
  chromeInline?: boolean;
};

export function AccountMenu({
  showAnonymousSignup = true,
  chromeInline = false,
}: AccountMenuProps) {
  const { isLoading, user, effectiveTier, isTrialActive, signOut } = useUser();
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

  if (isLoading) {
    return null;
  }

  const wrapClass = chromeInline ? 'relative' : '';

  if (!user) {
    if (!showAnonymousSignup) {
      return null;
    }
    return (
      <div className={wrapClass}>
        <Link
          href="/signup"
          prefetch={false}
          className="inline-flex max-w-[min(10rem,calc((100vw-min(95vw,1400px))/2-4px))] whitespace-normal rounded-md border border-white/10 bg-black/80 px-1.5 py-0.5 text-center text-[10px] font-medium leading-tight text-white/75 shadow-lg backdrop-blur-sm transition-colors hover:bg-black/90 hover:text-white/90"
          aria-label="Sign up for free access"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const email = user.email ?? '';
  const { label, className } = tierDisplay(
    user.tier,
    effectiveTier,
    isTrialActive
  );

  return (
    <div ref={rootRef} className={wrapClass}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/80 text-white shadow-lg transition-colors hover:bg-black/90"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <MenuHamburger className="shrink-0 opacity-95" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-white/10 bg-zinc-950/98 p-3 shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p
            className="truncate px-0.5 text-xs text-white/40"
            title={email || undefined}
          >
            {email ? truncateEmail(email) : '—'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
            >
              {label}
            </span>
          </div>
          <div className="my-3 border-t border-white/10" />
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-lg px-2 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/10"
            onClick={() => void onSignOut()}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
