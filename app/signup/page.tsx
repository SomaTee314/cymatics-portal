'use client';

import { EmailAuthFollowup } from '@/components/EmailAuthFollowup';
import { SignupLinkRecoveryForm } from '@/components/SignupLinkRecoveryForm';
import { authCallbackAbsoluteUrl, authNextFromSearchParam } from '@/lib/auth/auth-redirect';
import { SIGNUP_MIN_PASSWORD_LEN } from '@/lib/auth/signup-post-verify';
import {
  messageForOtpRequestError,
  otpCooldownRemainingMs,
  recordOtpRequestSent,
} from '@/lib/auth/otp-error-message';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  FormEvent,
  useState,
  Suspense,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignupForm() {
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
  const authFailed = searchParams.get('error') === 'auth_failed';
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  useEffect(() => {
    if (!authFailed) {
      setAuthMessage(null);
      return;
    }
    const reason = searchParams.get('reason');
    if (reason === 'pkce') {
      setAuthMessage(
        'That link often fails if it opens in another browser or inside your email app. Use the same browser you started in, or finish sign-up with your email and the 6-digit code in the section below.',
      );
      return;
    }
    if (reason === 'expired' || reason === 'exchange') {
      setAuthMessage(
        'This sign-up link is invalid, expired, or was already used. Request a new link from the form below, or enter your email and 6-digit code if your message includes one.',
      );
      return;
    }
    if (reason === 'missing_code') {
      setAuthMessage(
        'The sign-up link was missing data (try opening it in one tap). Use the form below to request a new link or verify with your email and code.',
      );
      return;
    }
    setAuthMessage(
      'We could not complete sign-up from that link. Use the form below to try again or enter your email and 6-digit code.',
    );
  }, [searchParams, authFailed]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitInFlight.current) return;
    setErr(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErr('Enter a valid email address.');
      return;
    }
    const pwd = password.trim();
    if (pwd.length < SIGNUP_MIN_PASSWORD_LEN) {
      setErr(`Password must be at least ${SIGNUP_MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (pwd !== confirmPassword) {
      setErr('Passwords do not match.');
      return;
    }
    const wait = otpCooldownRemainingMs(trimmed);
    if (wait > 0) {
      setErr(
        `Please wait ${Math.ceil(wait / 1000)}s before requesting another code for this address.`,
      );
      return;
    }
    submitInFlight.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: authCallbackAbsoluteUrl(
            window.location.origin,
            nextPath,
            'signup',
          ),
        },
      });
      if (error) {
        setErr(messageForOtpRequestError(error));
        return;
      }
      recordOtpRequestSent(trimmed);
      setSuccessEmail(trimmed);
    } catch {
      setErr('Network error. Check your connection and try again.');
    } finally {
      submitInFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="auth-page-shell relative">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        <header className="mb-6 flex shrink-0 items-center justify-between gap-3 sm:mb-10">
          <Link
            href="/"
            className="font-heading inline-flex min-h-11 min-w-0 items-center text-sm font-medium tracking-tight text-white/70 transition-colors hover:text-white"
          >
            ← Cymatics Portal
          </Link>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            aria-label="Close and return home"
          >
            <span className="text-2xl leading-none" aria-hidden>
              &times;
            </span>
          </button>
        </header>

        <main className="auth-main">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_80px_-20px_rgba(255,255,255,0.08)]">
            {successEmail ? (
              <div className="text-center sm:text-left">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
                  Check your inbox
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  We&apos;ve sent a magic link to{' '}
                  <span className="text-white/90">{successEmail}</span>. Open
                  the link in this same browser, or use the 6-digit code in that
                  email to finish signing up.
                </p>
                <EmailAuthFollowup
                  email={successEmail}
                  nextPath={nextPath}
                  variant="signup"
                  pendingPassword={password}
                  pendingDisplayName={displayName.trim() || null}
                />
              </div>
            ) : (
              <>
                <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
                  Sign up for free access
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  Create your account with email and password. New accounts get a
                  7-day Pro trial — no card required.
                </p>

                {authMessage ? (
                  <p className="mt-6 text-sm text-red-400/95">{authMessage}</p>
                ) : null}

                {authFailed ? (
                  <SignupLinkRecoveryForm
                    nextPath={nextPath}
                    pendingPassword={password}
                    pendingDisplayName={displayName.trim() || null}
                  />
                ) : null}

                {authFailed ? (
                  <p className="mt-6 text-center text-xs font-medium uppercase tracking-wide text-white/35">
                    Or start fresh
                  </p>
                ) : null}

                <form
                  onSubmit={onSubmit}
                  className={`space-y-5 ${authFailed ? 'mt-4' : 'mt-8'}`}
                >
                  <div>
                    <label htmlFor="signup-email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="signup-email"
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
                    <label htmlFor="signup-display-name" className="sr-only">
                      Display name (optional)
                    </label>
                    <input
                      id="signup-display-name"
                      type="text"
                      autoComplete="nickname"
                      enterKeyHint="next"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name (optional)"
                      disabled={busy}
                      className="auth-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-password" className="sr-only">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      enterKeyHint="next"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      disabled={busy}
                      className="auth-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-confirm" className="sr-only">
                      Confirm password
                    </label>
                    <input
                      id="signup-confirm"
                      type="password"
                      autoComplete="new-password"
                      enterKeyHint="done"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                        Sending...
                      </>
                    ) : (
                      'Sign up for free access'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-white/40 sm:text-left">
            Already have an account?{' '}
            <Link
              href={
                nextPath !== '/'
                  ? `/login?redirect=${encodeURIComponent(nextPath)}`
                  : '/login'
              }
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-black font-sans text-white/50">
          Loading…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
