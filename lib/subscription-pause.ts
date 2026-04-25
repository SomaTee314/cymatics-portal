/**
 * When `NEXT_PUBLIC_SUBSCRIPTION_PAUSED=true`, the shell skips redirecting to `/pricing`
 * on iframe upgrade/session-expired postMessages (Polar integration can stay off).
 * Iframe tier always follows the user profile / `free` for anonymous — it does not unlock the canvas.
 */
export function isSubscriptionPaused(): boolean {
  return process.env.NEXT_PUBLIC_SUBSCRIPTION_PAUSED === 'true';
}
