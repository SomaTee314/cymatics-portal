import type { AuthError } from '@supabase/supabase-js';

/**
 * User-facing text for `signInWithOtp` failures. Supabase enforces stricter
 * limits on the free plan (per IP, per email, and per time window) — shared
 * Wi‑Fi can hit the same IP cap even on a "new" device.
 */
export function messageForOtpRequestError(error: AuthError | null | undefined) {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  const status = error.status;
  const code = (error as { code?: string }).code?.toLowerCase() ?? '';
  const msg = (error.message || '').toLowerCase();

  const isRateLike =
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'too_many_requests' ||
    /rate|too many|too_many|throttl|for security|once every|email rate|send rate|requests? (exceeded|limit)/i.test(
      msg
    );

  if (isRateLike) {
    return (
      'Too many magic-link emails from this address or from your network. ' +
      'Everyone on the same Wi‑Fi shares one limit. Wait 15–60 minutes, try mobile data, ' +
      'or another network. Project owners can relax limits in Supabase → Authentication → Rate Limits.'
    );
  }

  return error.message;
}

/** Soft spacing between OTP sends from this tab (avoids double clicks + reduces server 429s). */
const OTP_COOLDOWN_MS = 55_000;

export function otpCooldownRemainingMs(email: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const key = 'cp_otp_last_' + email.trim().toLowerCase();
    const last = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (!last) return 0;
    return Math.max(0, OTP_COOLDOWN_MS - (Date.now() - last));
  } catch {
    return 0;
  }
}

export function recordOtpRequestSent(email: string) {
  try {
    sessionStorage.setItem(
      'cp_otp_last_' + email.trim().toLowerCase(),
      String(Date.now())
    );
  } catch {
    /* ignore */
  }
}
