'use client';

import Link from 'next/link';
import { useEffect } from 'react';

const REDIRECT = '/';

type SignUpPromptModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Shown when the iframe reports a locked-feature interaction (not full-page gate).
 */
export function SignUpPromptModal({ open, onClose }: SignUpPromptModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-prompt-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="Close sign-up prompt"
        >
          <span className="text-xl font-light leading-none" aria-hidden>
            ×
          </span>
        </button>
        <h2
          id="signup-prompt-title"
          className="text-balance text-xl font-semibold tracking-tight text-white"
        >
          Create a free account to use this
        </h2>
        <p className="mt-3 text-sm text-white/60">
          7-day Pro trial with full access to every frequency, mode, and visual.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/signup?redirect=${encodeURIComponent(REDIRECT)}`}
            prefetch={false}
            onClick={onClose}
            className="inline-flex justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white/90"
          >
            Sign up free
          </Link>
          <Link
            href={`/login?redirect=${encodeURIComponent(REDIRECT)}`}
            prefetch={false}
            onClick={onClose}
            className="inline-flex justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
