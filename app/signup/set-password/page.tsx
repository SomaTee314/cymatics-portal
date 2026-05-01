'use client';

import { authNextFromSearchParam } from '@/lib/auth/auth-redirect';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const MIN_PASSWORD_LEN = 6;

function SetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () =>
      authNextFromSearchParam(
        searchParams.get('redirect'),
        searchParams.get('next'),
      ),
    [searchParams],
  );
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const submitInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        const u = new URL('/signup', window.location.origin);
        if (nextPath && nextPath !== '/') {
          u.searchParams.set('redirect', nextPath);
        }
        router.replace(u.pathname + u.search);
        return;
      }
      setSessionChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router, nextPath]);

  const goNext = () => {
    router.replace(nextPath || '/');
    router.refresh();
  };

  const onSkip = () => {
    goNext();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitInFlight.current || !sessionChecked) return;
    setErr(null);
    if (password.length < MIN_PASSWORD_LEN) {
      setErr(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    submitInFlight.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErr(error.message);
        return;
      }
      goNext();
    } catch {
      setErr('Network error. Try again.');
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black font-sans text-white/50">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black px-4 py-8 sm:py-12">
      <button
        type="button"
        onClick={() => router.push('/')}
        className="absolute right-4 top-4 z-10 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Close and return home"
      >
        <span className="text-2xl leading-none" aria-hidden>
          &times;
        </span>
      </button>
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        <header className="mb-10">
          <Link
            href="/"
            className="font-heading text-sm font-medium tracking-tight text-white/70 transition-colors hover:text-white"
          >
            ← Cymatics Portal
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center pb-12">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_80px_-20px_rgba(255,255,255,0.08)]">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
              Create a password
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Optional — you can keep signing in with email link. Add a password
              if you want to sign in faster next time.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="set-pw-password" className="sr-only">
                  Password
                </label>
                <input
                  id="set-pw-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  disabled={busy}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/25 focus:ring-1 focus:ring-white/20 disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="set-pw-confirm" className="sr-only">
                  Confirm password
                </label>
                <input
                  id="set-pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  disabled={busy}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/25 focus:ring-1 focus:ring-white/20 disabled:opacity-50"
                />
                {err ? (
                  <p className="mt-2 text-sm text-red-400/95">{err}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-medium text-black transition-opacity hover:opacity-95 disabled:opacity-50"
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
                  'Save password and continue'
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={onSkip}
              disabled={busy}
              className="mt-4 w-full rounded-xl border border-white/15 bg-transparent py-3 text-sm font-medium text-white/80 transition-opacity hover:bg-white/5 disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-white/40 sm:text-left">
            Wrong place?{' '}
            <Link
              href="/login"
              prefetch={false}
              className="text-white/40 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Sign in
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}

export default function SignupSetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black font-sans text-white/50">
          Loading…
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
