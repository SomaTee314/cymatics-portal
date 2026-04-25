'use client';

import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignupForm() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErr('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('rate') || msg.includes('too many')) {
          setErr('Too many attempts. Please wait a few minutes and try again.');
        } else {
          setErr(error.message);
        }
        return;
      }
      setSuccessEmail(trimmed);
    } catch {
      setErr('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black px-4 py-8 sm:py-12">
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
            {successEmail ? (
              <p className="text-center text-sm leading-relaxed text-white/60 sm:text-left">
                Check your inbox — we&apos;ve sent you a magic link to{' '}
                <span className="text-white/90">{successEmail}</span>. Click it
                to begin your trial.
              </p>
            ) : (
              <>
                <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
                  Begin Your Resonance
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  Start with 7 days of full Pro access. No card required.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-5">
                  <div>
                    <label htmlFor="signup-email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
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
                        Sending...
                      </>
                    ) : (
                      'Start Free Trial'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-white/40 sm:text-left">
            Already have an account?{' '}
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

export default function SignupPage() {
  return <SignupForm />;
}
