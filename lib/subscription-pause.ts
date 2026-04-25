/**
 * Set `NEXT_PUBLIC_SUBSCRIPTION_PAUSED=true` in production to ship without paywalls,
 * session limits, or iframe free-tier gating. Re-enable subscriptions by unsetting
 * or setting this to `false` (then redeploy).
 */
export function isSubscriptionPaused(): boolean {
  return process.env.NEXT_PUBLIC_SUBSCRIPTION_PAUSED === 'true';
}
