'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  isDevMode,
  DEV_USER_CONTEXT,
  DEV_MODE_LOG_MESSAGE,
} from '@/lib/dev-mode';
import {
  resolveEffectiveTier,
  getFeaturesForTier,
  trialDaysRemaining,
  FREE_VISUAL_MODES,
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
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ user: User | null; session: Session | null }>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (sessionHint?: Session | null) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const devMode = isDevMode();
  /** Mock profile only in local `next dev` — production builds always use Supabase session. */
  const useMockDevProfile = devMode && process.env.NODE_ENV === 'development';
  const [supabase] = useState(() => createClient());
  /** De-dupe profile loads when login + `onAuthStateChange` fire together. */
  const fetchProfileInflight = useRef(
    new Map<string, Promise<UserProfile | null>>()
  );

  const fetchProfile = useCallback(
    async (userId: string) => {
      const inflight = fetchProfileInflight.current;
      const existing = inflight.get(userId);
      if (existing) return existing;

      const work = (async (): Promise<UserProfile | null> => {
        /** Never block sign-in forever if Postgres/PostgREST is slow or hung. */
        const PROFILE_QUERY_HARD_MS = 12000;

        const loadAttempt = async () => {
          const load = () =>
            supabase.from('profiles').select('*').eq('id', userId).single();

          let { data, error } = await load();

          /* Trigger may commit slightly after auth.users insert; short staggered retries. */
          if (error?.code === 'PGRST116') {
            const delaysMs = [60, 100, 150, 200, 250];
            for (const ms of delaysMs) {
              await new Promise((r) => setTimeout(r, ms));
              const retry = await load();
              data = retry.data;
              error = retry.error;
              if (!error || error.code !== 'PGRST116') break;
            }
          }

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
        };

        const raced = await Promise.race([
          loadAttempt(),
          new Promise<UserProfile | null>((resolve) => {
            window.setTimeout(() => {
              console.warn('[UserContext] fetchProfile timed out', {
                userId,
                ms: PROFILE_QUERY_HARD_MS,
              });
              resolve(null);
            }, PROFILE_QUERY_HARD_MS);
          }),
        ]);
        return raced;
      })();

      inflight.set(userId, work);
      void work.finally(() => {
        if (inflight.get(userId) === work) inflight.delete(userId);
      });
      return work;
    },
    [supabase]
  );

  const refreshProfile = useCallback(
    async (sessionHint?: Session | null) => {
      if (useMockDevProfile) return;
      let session: Session | null =
        sessionHint !== undefined && sessionHint !== null ? sessionHint : null;
      if (!session) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }
      const authUser = session?.user;
      if (!authUser) return;
      const profile = await fetchProfile(authUser.id);
      setUser(profile ?? stubProfileFromAuthUser(authUser));
    },
    [useMockDevProfile, supabase, fetchProfile],
  );

  useEffect(() => {
    if (useMockDevProfile) {
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
  }, [useMockDevProfile, supabase, fetchProfile]);

  const effectiveTier = user
    ? resolveEffectiveTier(user.tier, user.trialExpiresAt)
    : 'free';

  const features = useMemo((): TierFeatures => {
    const base = getFeaturesForTier(effectiveTier);
    if (!user && !useMockDevProfile) {
      return { ...base, visualModes: [...FREE_VISUAL_MODES] };
    }
    return base;
  }, [user, effectiveTier, useMockDevProfile]);
  const trialDaysLeft = user ? trialDaysRemaining(user.trialExpiresAt) : 0;
  const isTrialActive = user?.tier === 'trial' && trialDaysLeft > 0;
  const isTrialExpired = user?.tier === 'trial' && trialDaysLeft === 0;

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return {
        user: data.user,
        session: data.session,
      };
    },
    [supabase],
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
      /* Real Supabase users only — not the local dev mock (`dev-user`). */
      isAuthenticated: !!user && user.id !== DEV_USER_CONTEXT.id,
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
