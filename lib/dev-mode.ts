/** Console message when dev unlock is active (shell + iframe use the same text). */
export const DEV_MODE_LOG_MESSAGE =
  '[CymaticsPortal] Full feature unlock (dev) — tier: creator. To test free-tier / subscriptions locally: set NEXT_PUBLIC_DEV_MODE=false and NEXT_PUBLIC_FORCE_SUBSCRIPTION_GATES=true, then restart next dev.';

/**
 * Full iframe + mock profile unlock for local work.
 *
 * - `NEXT_PUBLIC_DEV_MODE=true` — always on (including production builds; avoid in prod deploys).
 * - `NEXT_PUBLIC_DEV_MODE=false` — off; real tier + gates from auth/profile.
 * - Unset while running `next dev` — on by default so the iframe does not pin free-tier presets.
 * - `NEXT_PUBLIC_FORCE_SUBSCRIPTION_GATES=true` — off in development (test gating without a prod build).
 * - `NEXT_PUBLIC_SUBSCRIPTION_PAUSED=true` — see `lib/subscription-pause.ts` (full iframe access; re-enable paywalls later).
 */
export function isDevMode(): boolean {
  const explicit = process.env.NEXT_PUBLIC_DEV_MODE;
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  if (process.env.NEXT_PUBLIC_FORCE_SUBSCRIPTION_GATES === 'true') return false;
  return process.env.NODE_ENV === 'development';
}

export const DEV_USER_CONTEXT = {
  id: 'dev-user',
  email: 'dev@cymaticsportal.local',
  tier: 'creator' as const,
  trialStartedAt: null as string | null,
  trialExpiresAt: null as string | null,
  subscriptionStatus: 'active',
  isAuthenticated: false,
  isDevMode: true,
};
