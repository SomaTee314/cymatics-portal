'use client';

import {
  applyPasswordAndDisplayName,
  SIGNUP_MIN_PASSWORD_LEN,
  signupSetPasswordPath,
} from '@/lib/auth/signup-post-verify';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Variant = 'login' | 'signup';

export function EmailAuthFollowup({
  email,
  nextPath,
  variant,
  pendingPassword,
  pendingDisplayName,
}: {
  email: string;
  nextPath: string;
  variant: Variant;
  pendingPassword?: string;
  pendingDisplayName?: string | null;
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
        if (variant === 'signup') {
          const pwd = pendingPassword?.trim() ?? '';
          if (pwd.length >= SIGNUP_MIN_PASSWORD_LEN) {
            const { error: applyErr } = await applyPasswordAndDisplayName(
              supabase,
              pwd,
              pendingDisplayName ?? null,
            );
            if (applyErr) {
              setOtpErr(applyErr);
              return;
            }
            router.replace(nextPath || '/');
            router.refresh();
            return;
          }
          router.replace(signupSetPasswordPath(nextPath || '/'));
          router.refresh();
          return;
        }
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
        const pwd = pendingPassword?.trim() ?? '';
        if (pwd.length >= SIGNUP_MIN_PASSWORD_LEN) {
          const { error: applyErr } = await applyPasswordAndDisplayName(
            supabase,
            pwd,
            pendingDisplayName ?? null,
          );
          if (applyErr) {
            setOtpErr(applyErr);
            return;
          }
          router.replace(nextPath || '/');
          router.refresh();
          return;
        }
        router.replace(signupSetPasswordPath(nextPath || '/'));
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
          className="auth-field"
        />
        {otpErr ? (
          <p className="text-sm text-red-400/95">{otpErr}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="auth-button-primary border border-white/15 bg-white/5 text-white hover:bg-white/10"
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
