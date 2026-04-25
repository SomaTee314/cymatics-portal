'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Variant = 'login' | 'signup';

export function EmailAuthFollowup({
  email,
  nextPath,
  variant,
}: {
  email: string;
  nextPath: string;
  variant: Variant;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpErr, setOtpErr] = useState<string | null>(null);

  const onSubmitOtp = async (e: FormEvent) => {
    e.preventDefault();
    setOtpErr(null);
    const token = otp.replace(/\D/g, '');
    if (token.length < 6) {
      setOtpErr('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const emailFlow = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (!emailFlow.error) {
        router.replace(nextPath || '/');
        router.refresh();
        return;
      }
      if (variant === 'signup') {
        const signupFlow = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'signup',
        });
        if (signupFlow.error) {
          setOtpErr(signupFlow.error.message);
          return;
        }
        router.replace(nextPath || '/');
        router.refresh();
        return;
      }
      setOtpErr(emailFlow.error.message);
      return;
    } catch {
      setOtpErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 border-t border-white/10 pt-6">
      <h2 className="font-heading text-sm font-medium tracking-tight text-white/90">
        Or use a one-time code
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-white/45">
        If the link doesn’t work (other device, or your mail app opened a
        private browser), enter the 6-digit code from the same email. Your
        Supabase email template must include the one-time code (
        <code className="rounded bg-white/10 px-1 text-[0.7rem] text-white/70">
          {'{{ .Token }}'}
        </code>
        ).
      </p>
      <form onSubmit={onSubmitOtp} className="mt-4 space-y-3">
        <label className="sr-only" htmlFor="email-otp">
          6-digit code
        </label>
        <input
          id="email-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="6-digit code"
          disabled={busy}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/25 focus:ring-1 focus:ring-white/20 disabled:opacity-50"
        />
        {otpErr ? (
          <p className="text-sm text-red-400/95">{otpErr}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white transition-opacity hover:bg-white/10 disabled:opacity-50"
        >
          {busy
            ? 'Verifying…'
            : variant === 'signup'
              ? 'Verify and continue'
              : 'Sign in with code'}
        </button>
      </form>
    </div>
  );
}
