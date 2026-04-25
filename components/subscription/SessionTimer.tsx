'use client';

import { useUser } from '@/context/UserContext';
import { useEffect, useState } from 'react';

export function SessionTimer() {
  const { effectiveTier, features, isDevMode, isAuthenticated } = useUser();
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const sessionLimit = features.sessionMinutes;

  useEffect(() => {
    if (isDevMode || sessionLimit === Infinity) {
      setSecondsRemaining(null);
      return;
    }

    setSecondsRemaining(sessionLimit * 60);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionLimit, isDevMode]);

  if (secondsRemaining === null || isDevMode) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isLow = secondsRemaining < 120;
  const isExpired = secondsRemaining <= 0;

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90">
        <div className="max-w-md rounded-2xl border border-white/10 bg-black p-8 text-center">
          <h2 className="mb-3 text-xl font-semibold text-white">Session complete</h2>
          <p className="mb-6 text-sm text-white/60">
            You&apos;ve reached the free session limit.
            {isAuthenticated
              ? ' Upgrade to Pro for unlimited sessions.'
              : ' Sign up for a free 7-day Pro trial.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-white/20 px-5 py-2 text-sm text-white hover:bg-white/5"
            >
              New session
            </button>
            <a
              href={isAuthenticated ? '/pricing' : '/signup'}
              className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90"
            >
              {isAuthenticated ? 'Upgrade' : 'Start free trial'}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (secondsRemaining > 300 || dismissed) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-[90] rounded-full border px-4 py-2 font-mono text-sm transition-colors ${
        isLow
          ? 'border-red-500/30 bg-red-500/20 text-red-400'
          : 'border-white/10 bg-white/10 text-white/60'
      }`}
    >
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-2 text-white/30 hover:text-white/60"
        aria-label="Dismiss timer"
      >
        ×
      </button>
    </div>
  );
}
