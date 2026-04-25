'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { isDevMode, DEV_USER_CONTEXT, DEV_MODE_LOG_MESSAGE } from '@/lib/dev-mode';
import {
  resolveEffectiveTier,
  getFeaturesForTier,
  trialDaysRemaining,
  type UserTier,
  type TierFeatures,
} from '@/lib/tiers';

interface UserProfile {
  id: string;
  email: string | null;
  tier: UserTier;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  subscriptionStatus: string | null;
}

interface UserContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  isDevMode: boolean;
  user: UserProfile | null;
  effectiveTier: UserTier;
  features: TierFeatures;
  trialDaysLeft: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const devMode = isDevMode();
  const [supabase] = useState(() => createClient());

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[UserContext] fetchProfile failed', {
          userId,
          code: error.code,
          message: error.message,
          hint: 'Check profiles row exists (auth trigger) and RLS.',
        });
        return null;
      }
      if (!data) {
        console.error('[UserContext] fetchProfile: no row for user', { userId });
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        tier: data.tier as UserTier,
        trialStartedAt: data.trial_started_at,
        trialExpiresAt: data.trial_expires_at,
        subscriptionStatus: data.subscription_status,
      } satisfies UserProfile;
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (devMode) return;
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await fetchProfile(authUser.id);
      if (profile) setUser(profile);
    }
  }, [devMode, supabase, fetchProfile]);

  useEffect(() => {
    if (devMode) {
      if (typeof window !== 'undefined') {
        console.info(DEV_MODE_LOG_MESSAGE);
      }
      setUser({
        id: DEV_USER_CONTEXT.id,
        email: DEV_USER_CONTEXT.email,
        tier: DEV_USER_CONTEXT.tier,
        trialStartedAt: DEV_USER_CONTEXT.trialStartedAt,
        trialExpiresAt: DEV_USER_CONTEXT.trialExpiresAt,
        subscriptionStatus: DEV_USER_CONTEXT.subscriptionStatus,
      });
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const profileTimeoutMs = 15000;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') return;
        if (!mounted) return;

        if (session?.user) {
          try {
            const profile = await Promise.race([
              fetchProfile(session.user.id),
              new Promise<null>((_, reject) => {
                window.setTimeout(
                  () => reject(new Error('profiles fetch timed out')),
                  profileTimeoutMs
                );
              }),
            ]);
            if (!profile) {
              console.error(
                '[UserContext] Session present but profiles row missing',
                {
                  authUserId: session.user.id,
                  email: session.user.email,
                  hint: 'Run sql/002_trigger_new_user.sql or insert profile manually.',
                }
              );
            }
            if (mounted) setUser(profile);
          } catch (e) {
            console.error('[UserContext] profile load failed', e);
            if (mounted) setUser(null);
          }
        } else {
          if (mounted) setUser(null);
        }

        if (mounted) setIsLoading(false);
      }
    );

    const loadingFailsafe = window.setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 20000);

    return () => {
      mounted = false;
      window.clearTimeout(loadingFailsafe);
      subscription.unsubscribe();
    };
  }, [devMode, supabase, fetchProfile]);

  const effectiveTier = user
    ? resolveEffectiveTier(user.tier, user.trialExpiresAt)
    : 'free';

  const features = getFeaturesForTier(effectiveTier);
  const trialDaysLeft = user ? trialDaysRemaining(user.trialExpiresAt) : 0;
  const isTrialActive = user?.tier === 'trial' && trialDaysLeft > 0;
  const isTrialExpired = user?.tier === 'trial' && trialDaysLeft === 0;

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
    [supabase]
  );

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('[UserContext] signOut error', error.message);
      setUser(null);
    } catch (e) {
      console.error('[UserContext] signOut exception', e);
      setUser(null);
    }
  }, [supabase]);

  const value = useMemo(
    () => ({
      isAuthenticated: !!user && !devMode,
      isLoading,
      isDevMode: devMode,
      user,
      effectiveTier,
      features,
      trialDaysLeft,
      isTrialActive,
      isTrialExpired,
      signIn,
      signUp,
      signInWithMagicLink,
      signOut,
      refreshProfile,
    }),
    [
      user,
      isLoading,
      devMode,
      effectiveTier,
      features,
      trialDaysLeft,
      isTrialActive,
      isTrialExpired,
      signIn,
      signUp,
      signInWithMagicLink,
      signOut,
      refreshProfile,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
