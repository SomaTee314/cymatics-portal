'use client';

import { SIGNUP_MIN_PASSWORD_LEN } from '@/lib/auth/signup-post-verify';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FormEvent, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const submitInFlight = useRef(false);

  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSessionReady(!!session);
  }, [supabase]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitInFlight.current) return;
    setErr(null);
    const p = password.trim();
    if (p.length < SIGNUP_MIN_PASSWORD_LEN) {
      setErr(`Password must be at least ${SIGNUP_MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (p !== confirm.trim()) {
      setErr('Passwords do not match.');
      return;
    }
    submitInFlight.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: p });
      if (error) {
        setErr(error.message);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setErr('Network error. Check your connection and try again.');
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  };

  if (sessionReady === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black font-sans text-white/50">
        Loading…
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="auth-page-shell">
        <div className="mx-auto w-full max-w-md flex-1 flex flex-col px-4">
          <main className="auth-main py-16">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-white">
                Link invalid or expired
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                Open the reset link from your email again, or request a new one. Links
                expire for security.
              </p>
              <p className="mt-6">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
                >
                  Request a new reset link
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
              Choose a new password
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Enter your new password below. You&apos;ll stay signed in on this
              device.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="new-password" className="sr-only">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  enterKeyHint="next"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  disabled={busy}
                  className="auth-field"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  enterKeyHint="done"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
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
                    Saving…
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
