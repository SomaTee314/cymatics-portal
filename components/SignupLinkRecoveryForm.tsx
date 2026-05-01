'use client';

import {
  applyPasswordAndDisplayName,
  SIGNUP_MIN_PASSWORD_LEN,
  signupSetPasswordPath,
} from '@/lib/auth/signup-post-verify';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupLinkRecoveryFormProps = {
  nextPath: string;
  pendingPassword?: string;
  pendingDisplayName?: string | null;
};

/**
 * Shown when magic-link return hits auth_failed (e.g. PKCE / in-app browser).
 * Lets the user enter email + 6-digit code without having completed “send link” first.
 */
export function SignupLinkRecoveryForm({
  nextPath,
  pendingPassword,
  pendingDisplayName,
}: SignupLinkRecoveryFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpErr, setOtpErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setOtpErr(null);
    const trimmedEmail = recoveryEmail.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setOtpErr('Enter the email you used to sign up.');
      return;
    }
    const token = otp.replace(/\D/g, '');
    if (token.length < 6) {
      setOtpErr('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const emailFlow = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: 'email',
      });
      if (!emailFlow.error) {
        await afterSignupVerify();
        return;
      }
      const signupFlow = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: 'signup',
      });
      if (signupFlow.error) {
        setOtpErr(signupFlow.error.message);
        return;
      }
      await afterSignupVerify();
    } catch {
      setOtpErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  };

  async function afterSignupVerify() {
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
  }

  return (
    <div className="mt-6 border-t border-white/10 pt-6">
      <h2 className="font-heading text-sm font-medium tracking-tight text-white/90">
        Finish with email and code
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-white/45">
        Enter the same email you used to sign up and the 6-digit code from your
        Cymatics Portal email.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="sr-only" htmlFor="recovery-email">
          Email
        </label>
        <input
          id="recovery-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          value={recoveryEmail}
          onChange={(e) => setRecoveryEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={busy}
          className="auth-field"
        />
        <label className="sr-only" htmlFor="recovery-otp">
          6-digit code
        </label>
        <input
          id="recovery-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="6-digit code"
          disabled={busy}
          className="auth-field"
        />
        {otpErr ? <p className="text-sm text-red-400/95">{otpErr}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="auth-button-primary border border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          {busy ? 'Verifying…' : 'Verify and continue'}
        </button>
      </form>
    </div>
  );
}
