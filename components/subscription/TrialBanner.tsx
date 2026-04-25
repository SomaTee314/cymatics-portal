'use client';

import { useUser } from '@/context/UserContext';

function SignOutButton() {
  const { signOut } = useUser();
  return (
    <button
      type="button"
      data-testid="logout"
      onClick={() => void signOut()}
      className="ml-3 text-sm font-medium text-white/50 underline-offset-4 hover:text-white hover:underline"
    >
      Sign out
    </button>
  );
}

type TrialBannerProps = {
  /** Nudge to sign up only after the user reaches the main cymatics view (3rd page of the flow). */
  reachedPortal: boolean;
  /** When the full-screen PortalSignUpGate is open, hide the slim duplicate strip. */
  hideAnonymousBar?: boolean;
};

export function TrialBanner({
  reachedPortal,
  hideAnonymousBar = false,
}: TrialBannerProps) {
  const {
    isTrialActive,
    isTrialExpired,
    trialDaysLeft,
    isDevMode,
    isAuthenticated,
  } = useUser();

  if (isDevMode) return null;

  if (isTrialActive) {
    return (
      <div className="relative z-[95] flex flex-wrap items-center justify-center gap-x-1 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-4 py-2 text-center">
        <span className="text-sm text-white/70">
          Pro trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
        </span>
        <a
          href="/pricing"
          className="ml-1 text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          Keep Pro →
        </a>
        <SignOutButton />
      </div>
    );
  }

  if (isTrialExpired) {
    return (
      <div className="relative z-[95] flex flex-wrap items-center justify-center gap-x-1 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center">
        <span className="text-sm text-amber-200/80">
          Your Pro trial has ended. Upgrade for full access.
        </span>
        <a
          href="/pricing"
          className="ml-1 text-sm font-medium text-amber-400 hover:text-amber-300"
        >
          View plans →
        </a>
        <SignOutButton />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (reachedPortal && !hideAnonymousBar) {
      return (
        <div className="relative z-[95] border-b border-white/5 bg-white/5 px-4 py-2 text-center">
          <span className="text-sm text-white/50">
            Full portal is for members — 7-day Pro trial, all features.
          </span>
          <a
            href="/signup?redirect=%2F"
            className="ml-2 text-sm font-medium text-white/90 hover:text-white"
          >
            Sign up free →
          </a>
        </div>
      );
    }
  }

  if (isAuthenticated) {
    return (
      <div className="relative z-[95] flex justify-end border-b border-white/5 bg-black/70 px-4 py-1.5">
        <SignOutButton />
      </div>
    );
  }

  return null;
}
