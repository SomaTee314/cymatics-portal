import type { SupabaseClient } from '@supabase/supabase-js';

export const SIGNUP_MIN_PASSWORD_LEN = 6;

export function signupSetPasswordPath(nextPath: string) {
  const base = '/signup/set-password';
  if (!nextPath || nextPath === '/') return base;
  return `${base}?redirect=${encodeURIComponent(nextPath)}`;
}

/**
 * After OTP/magic-link verify, persist password and optional display_name on profiles.
 */
export async function applyPasswordAndDisplayName(
  supabase: SupabaseClient,
  password: string,
  displayName: string | null
): Promise<{ error: string | null }> {
  const pwd = password.trim();
  if (pwd.length > 0 && pwd.length < SIGNUP_MIN_PASSWORD_LEN) {
    return { error: `Password must be at least ${SIGNUP_MIN_PASSWORD_LEN} characters.` };
  }
  if (pwd.length >= SIGNUP_MIN_PASSWORD_LEN) {
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return { error: error.message };
  }

  const name = displayName?.trim() || null;
  if (name) {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return { error: 'Session expired. Try signing in again.' };
    }
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', user.id);
    if (error) {
      console.error('[signup] profiles.display_name update failed', error);
      return {
        error:
          'Password was saved, but we could not save your display name. You can try again or update it later.',
      };
    }
  }

  return { error: null };
}
