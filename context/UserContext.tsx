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
import type { Session, User } from '@supabase/supabase-js';
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

/** When Supabase has a session but `profiles` is missing or slow, keep the UI logged in. */
function stubProfileFromAuthUser(authUser: User): UserProfile {
  return {
    id: authUser.id,
    email: authUser.email ?? null,
    tier: 'free',
    trialStartedAt: null,
    trialExpiresAt: null,
    subscriptionStatus: null,
  };
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
    if (!authUser) return;
    const profile = await fetchProfile(authUser.id);
    setUser(profile ?? stubProfileFromAuthUser(authUser));
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

    async function applyAuthSession(session: Session | null) {
      if (!session?.user) {
        if (mounted) setUser(null);
        return;
      }
      const authUser = session.user;
      try {
        const profile = await fetchProfile(authUser.id);
        if (!mounted) return;
        if (!profile) {
          console.warn(
            '[UserContext] No profiles row yet — using stub until DB trigger runs.',
            { authUserId: authUser.id, email: authUser.email }
          );
        }
        setUser(profile ?? stubProfileFromAuthUser(authUser));
      } catch (e) {
        console.error('[UserContext] profile load failed', e);
        if (mounted) setUser(stubProfileFromAuthUser(authUser));
      }
    }

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      await applyAuthSession(session);
      if (mounted) setIsLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') return;
        if (!mounted) return;
        await applyAuthSession(session);
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
