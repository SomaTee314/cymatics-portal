-- New auth users get pro tier (same feature set as paid Resonator / no time limit).
-- Re-run safe: replaces function only. Existing profiles are unchanged.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier, trial_started_at, trial_expires_at)
  VALUES (
    NEW.id,
    NEW.email,
    'pro',
    NULL,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
