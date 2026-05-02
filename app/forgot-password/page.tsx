'use client';

import { authCallbackAbsoluteUrl } from '@/lib/auth/auth-redirect';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FormEvent, useState, useRef } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitInFlight = useRef(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitInFlight.current) return;
    setErr(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErr('Enter a valid email address.');
      return;
    }
    submitInFlight.current = true;
    setBusy(true);
    try {
      const redirectTo = authCallbackAbsoluteUrl(
        window.location.origin,
        '/update-password',
      );
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setDone(true);
    } catch {
      setErr('Network error. Check your connection and try again.');
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="auth-page-shell">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        <header className="mb-6 sm:mb-10">
          <Link
            href="/login"
            prefetch={false}
            className="font-heading inline-flex min-h-11 items-center text-sm font-medium tracking-tight text-white/70 transition-colors hover:text-white"
          >
            ← Back to sign in
          </Link>
        </header>

        <main className="auth-main">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_80px_-20px_rgba(255,255,255,0.08)]">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
              Reset password
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              We&apos;ll email you a link to choose a new password. The link opens this
              site and works best in the same browser you use for Cymatics Portal.
            </p>

            {done ? (
              <p className="mt-8 text-sm leading-relaxed text-white/70">
                If an account exists for that address, we&apos;ve sent a reset link.
                Check your inbox and spam folder, then use the link to set a new
                password.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="forgot-email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="done"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={busy}
                    className="auth-field"
                  />
                  {err ? (
                    <p className="mt-2 text-sm text-red-400/95">{err}</p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="auth-button-primary bg-white text-black hover:opacity-95"
                >
                  {busy ? (
                    <>
                      <span
                        className="size-4 animate-spin rounded-full border-2 border-black border-t-transparent"
                        aria-hidden
                      />
                      Sending…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
