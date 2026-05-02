'use client';

import { authNextFromSearchParam } from '@/lib/auth/auth-redirect';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  FormEvent,
  useState,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitInFlight = useRef(false);

  const nextPath = useMemo(
    () =>
      authNextFromSearchParam(
        searchParams.get('redirect'),
        searchParams.get('next'),
      ),
    [searchParams],
  );

  useEffect(() => {
    if (searchParams.get('error') !== 'auth_failed') return;
    const reason = searchParams.get('reason');
    if (reason === 'pkce' || reason === 'expired' || reason === 'exchange') {
      setErr(
        'That sign-in link is invalid, expired, or was already used. If you were confirming email, try signing in with your password below.',
      );
      return;
    }
    if (reason === 'missing_code') {
      setErr(
        'The link was missing required data. Try signing in with your password below.',
      );
      return;
    }
    setErr('Sign-in could not be completed. Try again with your email and password.');
  }, [searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitInFlight.current) return;
    setErr(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErr('Enter a valid email address.');
      return;
    }
    if (!password) {
      setErr('Enter your password.');
      return;
    }
    submitInFlight.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      router.replace(nextPath || '/');
      router.refresh();
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
            href="/"
            className="font-heading inline-flex min-h-11 items-center text-sm font-medium tracking-tight text-white/70 transition-colors hover:text-white"
          >
            ← Cymatics Portal
          </Link>
        </header>

        <main className="auth-main">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_80px_-20px_rgba(255,255,255,0.08)]">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
              Welcome back
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Sign in with your email and password.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="login-email" className="sr-only">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="next"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={busy}
                  className="auth-field"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="sr-only">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  enterKeyHint="done"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
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
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-white/40 sm:text-left">
            Don&apos;t have an account?{' '}
            <Link
              href={
                nextPath !== '/'
                  ? `/signup?redirect=${encodeURIComponent(nextPath)}`
                  : '/signup'
              }
              prefetch={false}
              className="text-white/40 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Sign up for free access
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-black font-sans text-white/50">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
