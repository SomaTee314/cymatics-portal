# Cymatics Portal — Subscription Model Implementation Guide
## Cursor Build Document v1.0 — April 2026

---

## 1. Overview

This document provides Cursor with everything needed to implement a freemium subscription model with a 7-day Pro trial into the existing Cymatics Portal project. The payment provider is **Polar**. Auth is handled by **Supabase Auth**. Feature gating is managed client-side and server-side via a `user.tier` field in Supabase.

### Core Behaviour

1. **Anonymous visitors** can use the app immediately with Free tier limits (no signup required)
2. **Dev/test mode** bypasses all gating — full access with no login, controlled by environment variable
3. **On signup**, every new user gets a **7-day Pro trial** automatically (no card required)
4. **After trial expires**, user reverts to Free tier with soft upgrade prompts
5. **Paid users** (Pro/Creator) have features unlocked based on their active subscription
6. **Lifetime pass holders** are permanently set to Pro tier

### Architecture Principle

The subscription system is an **additive layer** on top of the existing app. The core cymatics engine, visual modes, and audio system remain unchanged. Gating is applied at the UI boundary — components check the user's tier and either render fully or show an upgrade prompt. No core engine code should be modified for subscription logic.

---

## 2. Tech Stack & Dependencies

### New Dependencies

```bash
# Auth + Database (already in stack)
npm install @supabase/supabase-js @supabase/ssr

# Payment provider
npm install @polar-sh/sdk

# Date handling for trial expiry
npm install date-fns
```

### Environment Variables

```env
# .env.local

# Existing
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Polar
POLAR_ACCESS_TOKEN=your_polar_access_token
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret
POLAR_ORGANIZATION_ID=your_polar_org_id
NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID=your_pro_product_id
NEXT_PUBLIC_POLAR_CREATOR_PRODUCT_ID=your_creator_product_id
NEXT_PUBLIC_POLAR_LIFETIME_PRODUCT_ID=your_lifetime_product_id

# Dev/Test bypass — set to "true" to unlock all features without login
NEXT_PUBLIC_DEV_MODE=true
```

**CRITICAL: `NEXT_PUBLIC_DEV_MODE=true`** grants full Creator-tier access with no authentication. Set to `"false"` or remove entirely in production. This is the mechanism that lets you test and change the app freely.

---

## 3. Database Schema (Supabase)

### 3.1 Profiles Table

```sql
-- Run in Supabase SQL Editor

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'trial', 'pro', 'creator', 'lifetime')),
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  subscription_id TEXT,              -- Polar subscription ID
  subscription_status TEXT,          -- 'active', 'canceled', 'past_due', 'incomplete'
  subscription_provider TEXT DEFAULT 'polar',
  current_period_end TIMESTAMPTZ,
  lifetime_purchased_at TIMESTAMPTZ, -- NULL unless lifetime pass holder
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do anything (for webhooks)
CREATE POLICY "Service role full access"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');
```

### 3.2 Auto-Create Profile on Signup (Trigger)

```sql
-- Automatically create a profile with 7-day trial when a user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier, trial_started_at, trial_expires_at)
  VALUES (
    NEW.id,
    NEW.email,
    'trial',
    NOW(),
    NOW() + INTERVAL '7 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.3 Saved Configurations Table (Pro+ Feature)

```sql
CREATE TABLE public.saved_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,  -- frequency, visual mode, colour settings, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own configs"
  ON public.saved_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 4. Tier System & Feature Gating

### 4.1 Tier Definitions

Create `lib/tiers.ts`:

```typescript
// lib/tiers.ts
// Central source of truth for all feature gating

export type UserTier = 'free' | 'trial' | 'pro' | 'creator' | 'lifetime';

export interface TierFeatures {
  maxPresets: number;
  solfeggioFrequencies: string[] | 'all';
  visualModes: string[] | 'all';
  sessionMinutes: number;
  exportWatermark: boolean;
  micInput: boolean;
  customFrequencyInput: boolean;
  videoExport: boolean;
  apiAccess: boolean;
  resolution4k: boolean;
  embedWidget: boolean;
  saveConfigs: boolean;
  maxSavedConfigs: number;
  customColourPalettes: boolean;
  commercialLicence: boolean;
}

export const FREE_SOLFEGGIO: string[] = ['432', '528'];
export const FREE_VISUAL_MODES: string[] = ['basic-chladni'];

export const TIER_FEATURES: Record<UserTier, TierFeatures> = {
  free: {
    maxPresets: 3,
    solfeggioFrequencies: FREE_SOLFEGGIO,
    visualModes: FREE_VISUAL_MODES,
    sessionMinutes: 15,
    exportWatermark: true,
    micInput: false,
    customFrequencyInput: false,
    videoExport: false,
    apiAccess: false,
    resolution4k: false,
    embedWidget: false,
    saveConfigs: false,
    maxSavedConfigs: 0,
    customColourPalettes: false,
    commercialLicence: false,
  },
  trial: {
    // Trial = full Pro access for 7 days
    maxPresets: Infinity,
    solfeggioFrequencies: 'all',
    visualModes: 'all',
    sessionMinutes: Infinity,
    exportWatermark: false,
    micInput: true,
    customFrequencyInput: true,
    videoExport: false,         // Video export is Creator-only, even during trial
    apiAccess: false,
    resolution4k: false,
    embedWidget: false,
    saveConfigs: true,
    maxSavedConfigs: 5,
    customColourPalettes: false,
    commercialLicence: false,
  },
  pro: {
    maxPresets: Infinity,
    solfeggioFrequencies: 'all',
    visualModes: 'all',
    sessionMinutes: Infinity,
    exportWatermark: false,
    micInput: true,
    customFrequencyInput: true,
    videoExport: false,
    apiAccess: false,
    resolution4k: false,
    embedWidget: false,
    saveConfigs: true,
    maxSavedConfigs: 20,
    customColourPalettes: false,
    commercialLicence: false,
  },
  creator: {
    maxPresets: Infinity,
    solfeggioFrequencies: 'all',
    visualModes: 'all',
    sessionMinutes: Infinity,
    exportWatermark: false,
    micInput: true,
    customFrequencyInput: true,
    videoExport: true,
    apiAccess: true,
    resolution4k: true,
    embedWidget: true,
    saveConfigs: true,
    maxSavedConfigs: Infinity,
    customColourPalettes: true,
    commercialLicence: true,
  },
  lifetime: {
    // Lifetime = Pro tier permanently
    maxPresets: Infinity,
    solfeggioFrequencies: 'all',
    visualModes: 'all',
    sessionMinutes: Infinity,
    exportWatermark: false,
    micInput: true,
    customFrequencyInput: true,
    videoExport: false,
    apiAccess: false,
    resolution4k: false,
    embedWidget: false,
    saveConfigs: true,
    maxSavedConfigs: 20,
    customColourPalettes: false,
    commercialLicence: false,
  },
} as const;

// Helper: resolve effective tier (handles trial expiry)
export function resolveEffectiveTier(
  tier: UserTier,
  trialExpiresAt: string | null
): UserTier {
  if (tier === 'trial' && trialExpiresAt) {
    const expired = new Date(trialExpiresAt) < new Date();
    if (expired) return 'free';
  }
  return tier;
}

// Helper: get features for a tier
export function getFeaturesForTier(tier: UserTier): TierFeatures {
  return TIER_FEATURES[tier];
}

// Helper: check if a specific feature is available
export function hasFeature(
  tier: UserTier,
  feature: keyof TierFeatures
): boolean {
  const features = TIER_FEATURES[tier];
  const value = features[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (value === 'all') return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

// Helper: check if a specific visual mode is available
export function isVisualModeAvailable(
  tier: UserTier,
  modeId: string
): boolean {
  const modes = TIER_FEATURES[tier].visualModes;
  if (modes === 'all') return true;
  return modes.includes(modeId);
}

// Helper: check if a specific frequency is available
export function isFrequencyAvailable(
  tier: UserTier,
  frequencyHz: string
): boolean {
  const freqs = TIER_FEATURES[tier].solfeggioFrequencies;
  if (freqs === 'all') return true;
  return freqs.includes(frequencyHz);
}

// Helper: trial days remaining
export function trialDaysRemaining(trialExpiresAt: string | null): number {
  if (!trialExpiresAt) return 0;
  const diff = new Date(trialExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
```

### 4.2 Dev Mode Bypass

Create `lib/dev-mode.ts`:

```typescript
// lib/dev-mode.ts
// Dev mode grants full Creator-tier access without any authentication.
// Controlled by NEXT_PUBLIC_DEV_MODE environment variable.

export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === 'true';
}

// In dev mode, return a mock user context with Creator tier
export const DEV_USER_CONTEXT = {
  id: 'dev-user',
  email: 'dev@cymaticsportal.local',
  tier: 'creator' as const,
  trialStartedAt: null,
  trialExpiresAt: null,
  subscriptionStatus: 'active',
  isAuthenticated: false, // Not actually authenticated
  isDevMode: true,
};
```

---

## 5. Auth & User Context

### 5.1 Supabase Client Setup

Create `lib/supabase/client.ts`:

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `lib/supabase/server.ts`:

```typescript
// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

### 5.2 User Context Provider

Create `context/UserContext.tsx`:

```tsx
// context/UserContext.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { isDevMode, DEV_USER_CONTEXT } from '@/lib/dev-mode';
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
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  isDevMode: boolean;
  user: UserProfile | null;

  // Resolved tier (accounts for trial expiry)
  effectiveTier: UserTier;
  features: TierFeatures;
  trialDaysLeft: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;

  // Actions
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

  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      email: data.email,
      tier: data.tier as UserTier,
      trialStartedAt: data.trial_started_at,
      trialExpiresAt: data.trial_expires_at,
      subscriptionStatus: data.subscription_status,
    };
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (devMode) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const profile = await fetchProfile(authUser.id);
      if (profile) setUser(profile);
    }
  }, [devMode, supabase, fetchProfile]);

  useEffect(() => {
    if (devMode) {
      setUser(DEV_USER_CONTEXT as unknown as UserProfile);
      setIsLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        const profile = await fetchProfile(authUser.id);
        setUser(profile);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [devMode, supabase, fetchProfile]);

  // Resolve effective tier
  const effectiveTier = user
    ? resolveEffectiveTier(user.tier, user.trialExpiresAt)
    : 'free';

  const features = getFeaturesForTier(effectiveTier);
  const trialDaysLeft = user ? trialDaysRemaining(user.trialExpiresAt) : 0;
  const isTrialActive = user?.tier === 'trial' && trialDaysLeft > 0;
  const isTrialExpired = user?.tier === 'trial' && trialDaysLeft === 0;

  // Auth actions
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Profile + trial created automatically via DB trigger
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
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
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
```

### 5.3 Wrap Layout

In your root `app/layout.tsx`, wrap children with the provider:

```tsx
// app/layout.tsx — add UserProvider wrapping
import { UserProvider } from '@/context/UserContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
```

---

## 6. Feature Gate Components

### 6.1 Feature Gate Wrapper

Create `components/subscription/FeatureGate.tsx`:

```tsx
// components/subscription/FeatureGate.tsx
'use client';

import { useUser } from '@/context/UserContext';
import { type UserTier, type TierFeatures, hasFeature } from '@/lib/tiers';
import { type ReactNode } from 'react';

interface FeatureGateProps {
  feature: keyof TierFeatures;
  children: ReactNode;
  fallback?: ReactNode;         // What to show when locked
  softGate?: boolean;           // true = show blurred preview + upgrade prompt
}

export function FeatureGate({
  feature,
  children,
  fallback,
  softGate = false,
}: FeatureGateProps) {
  const { effectiveTier, isDevMode } = useUser();

  // Dev mode: always show full content
  if (isDevMode) return <>{children}</>;

  const allowed = hasFeature(effectiveTier, feature);

  if (allowed) return <>{children}</>;

  if (softGate) {
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none opacity-60">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <UpgradePrompt feature={feature} />
        </div>
      </div>
    );
  }

  return fallback ? <>{fallback}</> : null;
}

function UpgradePrompt({ feature }: { feature: keyof TierFeatures }) {
  const { isAuthenticated } = useUser();

  // Map feature keys to human-readable labels
  const featureLabels: Partial<Record<keyof TierFeatures, string>> = {
    micInput: 'Microphone Input',
    videoExport: 'Video Export',
    resolution4k: '4K Rendering',
    customFrequencyInput: 'Custom Frequency Dial',
    saveConfigs: 'Save Configurations',
    customColourPalettes: 'Custom Colour Palettes',
    embedWidget: 'Embeddable Widget',
    apiAccess: 'API Access',
    commercialLicence: 'Commercial Licence',
  };

  const label = featureLabels[feature] || 'This feature';

  return (
    <div className="bg-black/80 backdrop-blur-md rounded-xl p-6 text-center max-w-sm border border-white/10">
      <div className="text-white/60 text-xs uppercase tracking-widest mb-2">
        Pro Feature
      </div>
      <h3 className="text-white text-lg font-semibold mb-2">
        Unlock {label}
      </h3>
      <p className="text-white/50 text-sm mb-4">
        {isAuthenticated
          ? 'Upgrade to Pro to access this feature.'
          : 'Sign up for a free 7-day Pro trial.'}
      </p>
      <button
        onClick={() => {
          // Navigate to pricing/signup
          window.location.href = isAuthenticated ? '/pricing' : '/signup';
        }}
        className="px-6 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
      >
        {isAuthenticated ? 'View Plans' : 'Start Free Trial'}
      </button>
    </div>
  );
}
```

### 6.2 Frequency Gate (for Solfeggio Presets)

Create `components/subscription/FrequencyGate.tsx`:

```tsx
// components/subscription/FrequencyGate.tsx
'use client';

import { useUser } from '@/context/UserContext';
import { isFrequencyAvailable } from '@/lib/tiers';

interface FrequencyGateProps {
  frequencyHz: string;
  children: React.ReactNode;
}

export function FrequencyGate({ frequencyHz, children }: FrequencyGateProps) {
  const { effectiveTier, isDevMode, isAuthenticated } = useUser();

  if (isDevMode) return <>{children}</>;

  const available = isFrequencyAvailable(effectiveTier, frequencyHz);

  if (available) return <>{children}</>;

  return (
    <button
      onClick={() => {
        window.location.href = isAuthenticated ? '/pricing' : '/signup';
      }}
      className="relative group cursor-pointer opacity-50 hover:opacity-70 transition-opacity"
      title={`Unlock ${frequencyHz}Hz with Pro`}
    >
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-white text-xs font-medium px-3 py-1 bg-white/20 rounded-full">
          🔒 Pro
        </span>
      </div>
    </button>
  );
}
```

### 6.3 Visual Mode Gate

Create `components/subscription/VisualModeGate.tsx`:

```tsx
// components/subscription/VisualModeGate.tsx
'use client';

import { useUser } from '@/context/UserContext';
import { isVisualModeAvailable } from '@/lib/tiers';

interface VisualModeGateProps {
  modeId: string;
  modeName: string;
  onSelect: () => void;
  children: React.ReactNode; // The mode thumbnail/preview
}

export function VisualModeGate({
  modeId,
  modeName,
  onSelect,
  children,
}: VisualModeGateProps) {
  const { effectiveTier, isDevMode, isAuthenticated } = useUser();

  if (isDevMode) {
    return <div onClick={onSelect}>{children}</div>;
  }

  const available = isVisualModeAvailable(effectiveTier, modeId);

  if (available) {
    return <div onClick={onSelect}>{children}</div>;
  }

  return (
    <div
      onClick={() => {
        window.location.href = isAuthenticated ? '/pricing' : '/signup';
      }}
      className="relative cursor-pointer group"
    >
      <div className="blur-[2px] opacity-50">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-white text-xs font-medium px-3 py-1 bg-white/20 rounded-full mb-1">
          🔒 Unlock with Pro
        </span>
        <span className="text-white/60 text-[10px]">{modeName}</span>
      </div>
    </div>
  );
}
```

### 6.4 Session Timer (Free Tier)

Create `components/subscription/SessionTimer.tsx`:

```tsx
// components/subscription/SessionTimer.tsx
'use client';

import { useUser } from '@/context/UserContext';
import { useEffect, useState, useCallback } from 'react';

export function SessionTimer() {
  const { effectiveTier, features, isDevMode, isAuthenticated } = useUser();
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const sessionLimit = features.sessionMinutes;

  useEffect(() => {
    // No timer for unlimited tiers or dev mode
    if (isDevMode || sessionLimit === Infinity) {
      setSecondsRemaining(null);
      return;
    }

    setSecondsRemaining(sessionLimit * 60);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionLimit, isDevMode]);

  // Don't render if no limit
  if (secondsRemaining === null || isDevMode) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isLow = secondsRemaining < 120; // Last 2 minutes
  const isExpired = secondsRemaining <= 0;

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-black border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-white text-xl font-semibold mb-3">
            Session Complete
          </h2>
          <p className="text-white/60 text-sm mb-6">
            You&apos;ve reached the 15-minute free session limit.
            {isAuthenticated
              ? ' Upgrade to Pro for unlimited sessions.'
              : ' Sign up for a free 7-day Pro trial with unlimited sessions.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 border border-white/20 text-white rounded-lg text-sm hover:bg-white/5"
            >
              New Session
            </button>
            <button
              onClick={() => {
                window.location.href = isAuthenticated ? '/pricing' : '/signup';
              }}
              className="px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90"
            >
              {isAuthenticated ? 'Upgrade' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show countdown in last 5 minutes
  if (secondsRemaining > 300 || dismissed) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 px-4 py-2 rounded-full text-sm font-mono transition-colors ${
        isLow
          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
          : 'bg-white/10 text-white/60 border border-white/10'
      }`}
    >
      <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 text-white/30 hover:text-white/60"
      >
        ✕
      </button>
    </div>
  );
}
```

### 6.5 Trial Banner

Create `components/subscription/TrialBanner.tsx`:

```tsx
// components/subscription/TrialBanner.tsx
'use client';

import { useUser } from '@/context/UserContext';

export function TrialBanner() {
  const { isTrialActive, isTrialExpired, trialDaysLeft, isDevMode, isAuthenticated } = useUser();

  if (isDevMode) return null;

  // Show trial countdown for active trial users
  if (isTrialActive) {
    return (
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/5 px-4 py-2 text-center">
        <span className="text-white/70 text-sm">
          Pro Trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
        </span>
        <a
          href="/pricing"
          className="ml-3 text-indigo-400 text-sm font-medium hover:text-indigo-300"
        >
          Keep Pro →
        </a>
      </div>
    );
  }

  // Show upgrade prompt for expired trial users
  if (isTrialExpired) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
        <span className="text-amber-200/80 text-sm">
          Your Pro trial has ended. Upgrade to continue with full access.
        </span>
        <a
          href="/pricing"
          className="ml-3 text-amber-400 text-sm font-medium hover:text-amber-300"
        >
          View Plans →
        </a>
      </div>
    );
  }

  // Soft prompt for anonymous users after 3 sessions (tracked via localStorage)
  if (!isAuthenticated) {
    const sessionCount = getAnonymousSessionCount();
    if (sessionCount >= 3) {
      return (
        <div className="bg-white/5 border-b border-white/5 px-4 py-2 text-center">
          <span className="text-white/50 text-sm">
            You&apos;ve explored {sessionCount} sessions.
          </span>
          <a
            href="/signup"
            className="ml-2 text-white/80 text-sm font-medium hover:text-white"
          >
            Unlock all 9 Solfeggio frequencies free for 7 days →
          </a>
        </div>
      );
    }
  }

  return null;
}

function getAnonymousSessionCount(): number {
  if (typeof window === 'undefined') return 0;
  const count = parseInt(localStorage.getItem('cp_session_count') || '0', 10);
  return count;
}

// Call this when the app initialises a new session
export function incrementAnonymousSession() {
  if (typeof window === 'undefined') return;
  const count = parseInt(localStorage.getItem('cp_session_count') || '0', 10);
  localStorage.setItem('cp_session_count', String(count + 1));
}
```

---

## 7. Screenshot Export Watermark

### 7.1 Watermark Logic

When the user triggers a screenshot export, apply a watermark overlay for free-tier users:

```typescript
// lib/export.ts

import { type UserTier, TIER_FEATURES } from '@/lib/tiers';
import { isDevMode } from '@/lib/dev-mode';

export function shouldApplyWatermark(tier: UserTier): boolean {
  if (isDevMode()) return false;
  return TIER_FEATURES[tier].exportWatermark;
}

export function applyWatermarkToCanvas(
  canvas: HTMLCanvasElement,
  text: string = 'cymaticsportal.com'
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px "Space Grotesk", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(text, canvas.width - 20, canvas.height - 20);
  ctx.restore();

  return canvas;
}
```

---

## 8. Polar Payment Integration

### 8.1 Checkout Route

Create `app/api/checkout/route.ts`:

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Polar } from '@polar-sh/sdk';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { productId, successUrl, cancelUrl } = await req.json();

  try {
    const checkout = await polar.checkouts.create({
      productId,
      successUrl: successUrl || `${req.nextUrl.origin}/checkout/success`,
      customerEmail: user.email,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error('Checkout creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
```

### 8.2 Webhook Handler

Create `app/api/webhooks/polar/route.ts`:

```typescript
// app/api/webhooks/polar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhook operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('webhook-signature');

  // TODO: Verify webhook signature with POLAR_WEBHOOK_SECRET
  // For now, parse the event directly
  const event = JSON.parse(body);

  const userId = event.data?.metadata?.supabase_user_id;
  if (!userId) {
    console.error('No supabase_user_id in webhook metadata');
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated': {
      const sub = event.data;
      const tier = determineTier(sub.product_id);

      await supabase
        .from('profiles')
        .update({
          tier,
          subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_end: sub.current_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      break;
    }

    case 'subscription.canceled': {
      await supabase
        .from('profiles')
        .update({
          tier: 'free',
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      break;
    }

    case 'checkout.completed': {
      const checkout = event.data;
      // Check if this is a lifetime purchase
      if (checkout.product_id === process.env.NEXT_PUBLIC_POLAR_LIFETIME_PRODUCT_ID) {
        await supabase
          .from('profiles')
          .update({
            tier: 'lifetime',
            lifetime_purchased_at: new Date().toISOString(),
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
      break;
    }

    default:
      console.log('Unhandled webhook event:', event.type);
  }

  return NextResponse.json({ received: true });
}

function determineTier(productId: string): string {
  if (productId === process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID) return 'pro';
  if (productId === process.env.NEXT_PUBLIC_POLAR_CREATOR_PRODUCT_ID) return 'creator';
  if (productId === process.env.NEXT_PUBLIC_POLAR_LIFETIME_PRODUCT_ID) return 'lifetime';
  return 'free';
}
```

### 8.3 Pricing Page

Create `app/pricing/page.tsx`:

```tsx
// app/pricing/page.tsx
'use client';

import { useUser } from '@/context/UserContext';
import { useState } from 'react';

const PLANS = [
  {
    id: 'pro',
    name: 'Resonator',
    subtitle: 'Pro',
    monthlyPrice: '£7.77',
    yearlyPrice: '£59',
    yearlyMonthly: '£4.92',
    features: [
      'All Chladni presets & Solfeggio frequencies',
      'All visual modes',
      'Unlimited sessions',
      'Microphone input & FFT analysis',
      'Custom frequency dial',
      'Hi-res export (no watermark)',
      'Save & load configurations',
    ],
    productIdMonthly: process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID!,
    productIdYearly: process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID!, // Use yearly variant
  },
  {
    id: 'creator',
    name: 'Architect',
    subtitle: 'Creator',
    monthlyPrice: '£14.44',
    yearlyPrice: '£129',
    yearlyMonthly: '£10.75',
    features: [
      'Everything in Pro',
      'Video / GIF export',
      '4K resolution rendering',
      'Custom colour palettes',
      'Embeddable widget',
      'API access',
      'Commercial usage licence',
    ],
    productIdMonthly: process.env.NEXT_PUBLIC_POLAR_CREATOR_PRODUCT_ID!,
    productIdYearly: process.env.NEXT_PUBLIC_POLAR_CREATOR_PRODUCT_ID!,
    highlighted: true,
  },
];

export default function PricingPage() {
  const { effectiveTier, isAuthenticated } = useUser();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (productId: string) => {
    if (!isAuthenticated) {
      window.location.href = '/signup?redirect=/pricing';
      return;
    }

    setLoading(productId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-3 font-['Space_Grotesk']">
          Choose Your Frequency
        </h1>
        <p className="text-white/50 text-center mb-10 text-lg">
          Unlock the full spectrum of cymatics visualisation
        </p>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/5 rounded-full p-1 flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-5 py-2 rounded-full text-sm transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-5 py-2 rounded-full text-sm transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Yearly <span className="text-green-400 ml-1">Save 37%</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = effectiveTier === plan.id;
            const productId =
              billingPeriod === 'yearly'
                ? plan.productIdYearly
                : plan.productIdMonthly;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-8 ${
                  plan.highlighted
                    ? 'border-indigo-500/50 bg-indigo-500/5'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="text-white/40 text-xs uppercase tracking-widest mb-1">
                  {plan.subtitle}
                </div>
                <h2 className="text-2xl font-bold mb-1 font-['Space_Grotesk']">
                  {plan.name}
                </h2>
                <div className="mb-6">
                  <span className="text-3xl font-bold">
                    {billingPeriod === 'yearly'
                      ? plan.yearlyPrice
                      : plan.monthlyPrice}
                  </span>
                  <span className="text-white/40 text-sm ml-1">
                    /{billingPeriod === 'yearly' ? 'year' : 'month'}
                  </span>
                  {billingPeriod === 'yearly' && (
                    <div className="text-white/30 text-xs mt-1">
                      {plan.yearlyMonthly}/month billed annually
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-white/70 text-sm flex items-start gap-2"
                    >
                      <span className="text-green-400 mt-0.5">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(productId)}
                  disabled={isCurrent || loading === productId}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : plan.highlighted
                        ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                        : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {isCurrent
                    ? 'Current Plan'
                    : loading === productId
                      ? 'Loading...'
                      : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Lifetime pass */}
        <div className="mt-8 text-center border border-white/10 rounded-2xl p-8 bg-white/[0.02]">
          <div className="text-amber-400/80 text-xs uppercase tracking-widest mb-2">
            Founding 100
          </div>
          <h3 className="text-xl font-bold mb-2 font-['Space_Grotesk']">
            Lifetime Resonator — £144
          </h3>
          <p className="text-white/40 text-sm mb-4">
            One-time payment. Pro tier, forever. Limited to 100 founding supporters.
          </p>
          <button
            onClick={() =>
              handleCheckout(
                process.env.NEXT_PUBLIC_POLAR_LIFETIME_PRODUCT_ID!
              )
            }
            className="px-8 py-3 bg-amber-500 text-black rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors"
          >
            Claim Your Spot
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 9. Integration Points with Existing App

### 9.1 Where to Insert Gates

These are the specific integration points. The existing app code does NOT need restructuring — gates wrap existing components at the UI boundary.

| Existing Component / Feature | Gate Type | Implementation |
|-----|-----------|----------------|
| Solfeggio frequency selector | `<FrequencyGate>` | Wrap each frequency preset button. Free tier: only 432Hz and 528Hz clickable. Others show lock icon. |
| Visual mode picker | `<VisualModeGate>` | Wrap each mode thumbnail. Free tier: only `basic-chladni`. Others show blurred preview. |
| Microphone/FFT input toggle | `<FeatureGate feature="micInput">` | Wrap the mic activation button. |
| Custom Hz frequency dial | `<FeatureGate feature="customFrequencyInput">` | Wrap the frequency input control. |
| Screenshot export button | No gate | Available to all. Apply watermark for free tier via `shouldApplyWatermark()`. |
| Video/GIF export button | `<FeatureGate feature="videoExport">` | Hard gate. Creator tier only. |
| Save configuration button | `<FeatureGate feature="saveConfigs">` | Wrap the save button. |
| Main canvas/viewport | `<SessionTimer />` | Add SessionTimer component alongside main viewport. |
| Top of page / nav area | `<TrialBanner />` | Add TrialBanner at the top of the layout. |

### 9.2 Integration Example

If your main app page currently looks something like this:

```tsx
// BEFORE (simplified)
export default function CymaticsApp() {
  return (
    <main>
      <FrequencySelector />
      <VisualModeSelector />
      <CymaticsCanvas />
      <ControlPanel />
      <ExportButton />
    </main>
  );
}
```

After integration:

```tsx
// AFTER (simplified)
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { SessionTimer } from '@/components/subscription/SessionTimer';

export default function CymaticsApp() {
  return (
    <main>
      <TrialBanner />
      <FrequencySelector />    {/* FrequencyGate wraps inside this component */}
      <VisualModeSelector />   {/* VisualModeGate wraps inside this component */}
      <CymaticsCanvas />
      <ControlPanel />         {/* FeatureGates wrap mic, Hz dial, save inside */}
      <ExportButton />         {/* Watermark logic in export function */}
      <SessionTimer />
    </main>
  );
}
```

### 9.3 Dev Mode Verification Checklist

When `NEXT_PUBLIC_DEV_MODE=true`:

- [ ] All visual modes are accessible (no lock icons)
- [ ] All 9 Solfeggio frequencies are clickable
- [ ] Mic input toggle works
- [ ] Custom Hz dial is functional
- [ ] No session timer appears
- [ ] No trial banner appears
- [ ] Screenshots export without watermark
- [ ] No login/signup UI is shown
- [ ] Console logs: `[CymaticsPortal] Dev mode active — all features unlocked`

---

## 10. File Structure Summary

```
lib/
├── tiers.ts                          # Tier definitions, feature flags, helpers
├── dev-mode.ts                       # Dev mode bypass logic
├── export.ts                         # Watermark logic
├── supabase/
│   ├── client.ts                     # Browser Supabase client
│   └── server.ts                     # Server Supabase client

context/
└── UserContext.tsx                    # User state provider (auth + tier + trial)

components/subscription/
├── FeatureGate.tsx                   # Generic feature gate wrapper
├── FrequencyGate.tsx                 # Solfeggio frequency lock
├── VisualModeGate.tsx                # Visual mode lock
├── SessionTimer.tsx                  # Free tier session countdown
└── TrialBanner.tsx                   # Trial status banner + soft prompts

app/
├── layout.tsx                        # ← Add UserProvider wrapper here
├── pricing/
│   └── page.tsx                      # Pricing page with plan cards
├── signup/
│   └── page.tsx                      # Signup form (magic link or email/password)
├── login/
│   └── page.tsx                      # Login form
├── checkout/
│   └── success/
│       └── page.tsx                  # Post-checkout confirmation
├── api/
│   ├── checkout/
│   │   └── route.ts                  # Create Polar checkout session
│   └── webhooks/
│       └── polar/
│           └── route.ts              # Handle Polar webhook events

sql/
├── 001_profiles.sql                  # Profiles table + RLS policies
├── 002_trigger_new_user.sql          # Auto-create profile with trial on signup
└── 003_saved_configs.sql             # Saved configurations table
```

---

## 11. Implementation Sequence

Follow this order strictly. Each step depends on the previous.

### Phase 1: Foundation (Day 1–2)

1. Install dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `@polar-sh/sdk`, `date-fns`)
2. Create `.env.local` with all environment variables (set `NEXT_PUBLIC_DEV_MODE=true`)
3. Run SQL scripts in Supabase to create tables, trigger, and RLS policies
4. Create `lib/tiers.ts` — tier definitions and helpers
5. Create `lib/dev-mode.ts` — dev bypass
6. Create Supabase client files (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
7. Verify: app runs identically to before with no visual changes

### Phase 2: Auth + User Context (Day 2–3)

8. Create `context/UserContext.tsx`
9. Wrap root layout with `<UserProvider>`
10. Create signup page (`app/signup/page.tsx`) — magic link auth preferred
11. Create login page (`app/login/page.tsx`)
12. Verify: dev mode still grants full access, signup creates profile with trial in Supabase

### Phase 3: Feature Gating UI (Day 3–5)

13. Create `components/subscription/FeatureGate.tsx`
14. Create `components/subscription/FrequencyGate.tsx`
15. Create `components/subscription/VisualModeGate.tsx`
16. Create `components/subscription/SessionTimer.tsx`
17. Create `components/subscription/TrialBanner.tsx`
18. Create `lib/export.ts` — watermark logic
19. Integrate gates into existing app components (see §9.1 table)
20. Verify: in dev mode, zero visible changes. Toggle dev mode off → gates appear.

### Phase 4: Payment Integration (Day 5–7)

21. Create Polar account and products (Pro monthly, Pro yearly, Creator monthly, Creator yearly, Lifetime one-time)
22. Set Polar product IDs in `.env.local`
23. Create `app/api/checkout/route.ts`
24. Create `app/api/webhooks/polar/route.ts`
25. Create `app/pricing/page.tsx`
26. Create `app/checkout/success/page.tsx`
27. Configure Polar webhook URL to point to your `/api/webhooks/polar` endpoint
28. Test: complete a checkout in Polar test mode → verify profile tier updates in Supabase

### Phase 5: Polish & Test (Day 7–8)

29. Test complete user journey: anonymous → signup → trial → trial expiry → upgrade → paid
30. Test tier-specific behaviour for each visual mode and frequency
31. Test session timer for free tier
32. Test watermark on screenshot export
33. Test dev mode bypass end-to-end
34. Set `NEXT_PUBLIC_DEV_MODE=false` and verify production behaviour
35. Deploy to Vercel staging environment

---

## 12. Definitive Roadmap

### Pre-Launch (Weeks 1–2)

| Task | Priority | Owner | Notes |
|------|----------|-------|-------|
| Implement Phase 1–5 from §11 above | P0 | Dev (Cursor) | Follow sequence strictly |
| Create Polar account and configure products | P0 | Ren | Pro: £7.77/mo or £59/yr. Creator: £14.44/mo or £129/yr. Lifetime: £144. |
| Set up Polar webhook endpoint on Vercel | P0 | Ren | Must be HTTPS. Add webhook secret to env. |
| Decide auth method: magic link vs password | P1 | Ren | Magic link recommended (lower friction) |
| Populate free-tier presets | P1 | Dev | Select 3 best Chladni presets for free tier. Pick the 2 most compelling Solfeggio frequencies (432Hz, 528Hz). |
| Design upgrade prompts copy | P1 | Ren | Keep brand-aligned. Sacred geometry aesthetic. |
| Test Polar checkout in test mode | P0 | Ren | Complete full purchase flow before going live |

### Soft Launch (Week 3)

| Task | Priority | Notes |
|------|----------|-------|
| Set `NEXT_PUBLIC_DEV_MODE=false` in production env | P0 | This enables the subscription system |
| Deploy to production Vercel | P0 | |
| Open Lifetime pass sales (first 100 at £144) | P0 | Create urgency: "Founding 100" |
| Post launch announcement to r/cymatics | P1 | Include demo video/GIF |
| Post to r/sacredgeometry, r/soundhealing | P1 | Different angle for each community |
| Post to r/generativeart | P1 | Focus on the visual/algorithmic aspect |
| Set up Ko-fi or Buy Me a Coffee on free tier | P2 | Low-friction tip jar for non-subscribers |

### Iterate (Weeks 4–6)

| Task | Priority | Notes |
|------|----------|-------|
| Monitor conversion rate (target: 3%+ free-to-Pro) | P0 | Track via Supabase queries |
| A/B test free tier limits | P1 | If conversion <2%, restrict to 2 presets and 10 min sessions. If >5%, consider loosening. |
| Add "Icicle Bubbles" as first Pro-exclusive visual mode | P1 | Content drop drives engagement |
| Collect user feedback (in-app or Discord) | P1 | |
| Create social sharing: "Share your frequency" button | P2 | Generates social card with pattern + Hz |

### Creator Tier Launch (Weeks 7–8)

| Task | Priority | Notes |
|------|----------|-------|
| Implement video/GIF export (Creator feature) | P0 | Canvas recording API or MediaRecorder |
| Implement 4K render toggle (Creator feature) | P1 | Increase canvas resolution |
| Implement custom colour palettes (Creator feature) | P1 | Colour picker UI |
| Launch Creator tier pricing in Polar | P0 | |
| Approach 5 wellness studios for £29/mo B2B pilot | P1 | Cold email with demo link |
| Create embeddable `<iframe>` widget | P2 | For practitioner websites |

### Print-on-Demand & Digital Products (Month 3)

| Task | Priority | Notes |
|------|----------|-------|
| Set up Gelato account | P1 | Posters, canvas wraps, metal prints |
| Create 10 curated Chladni wallpaper renders (4K) | P1 | Sell as pack via Polar (£9.99) |
| Create "Chakra Series" frequency preset pack | P2 | Digital product, £4.99 |
| Launch "Custom Frequency Portrait" commissions | P2 | £25/49/99 tiers via Polar |
| Create "Cymatics in the Classroom" lesson pack | P1 | 3 lessons, worksheets, aligned to KS3/4 |

### Education Outreach (Months 4–6)

| Task | Priority | Notes |
|------|----------|-------|
| Build teacher dashboard (classroom licence) | P1 | Up to 30 concurrent users, usage analytics |
| Create 30-day free teacher trial | P0 | Entry point for school adoption |
| Approach 5 MATs via STEM Learning network or BETT contacts | P1 | £299–499/yr classroom licence |
| Apply for DfE EdTech funding (£1M pool) | P2 | Position as AI-enhanced physics learning tool |
| Create case study from first school pilot | P2 | Social proof for future sales |

### Scale (Months 6–12)

| Task | Priority | Notes |
|------|----------|-------|
| Evaluate payment platform (Polar → Paddle migration if needed) | P2 | If approaching £5k MRR |
| Implement API for Creator tier | P1 | Programmatic visualisation generation |
| Launch Discord community | P1 | Free for all, premium channels for Pro/Creator |
| Implement Patreon/patronage tier | P2 | Behind-the-scenes, feature voting |
| Reach £50k ARR milestone (~540 Pro subscribers) | P0 | Primary financial target |

---

## 13. Testing Commands

```bash
# Verify dev mode (should see all features unlocked)
NEXT_PUBLIC_DEV_MODE=true npm run dev

# Verify production mode (should see gating)
NEXT_PUBLIC_DEV_MODE=false npm run dev

# Check Supabase profile creation
# After signing up, run in Supabase SQL Editor:
SELECT id, tier, trial_started_at, trial_expires_at FROM profiles ORDER BY created_at DESC LIMIT 5;

# Simulate trial expiry (for testing)
UPDATE profiles SET trial_expires_at = NOW() - INTERVAL '1 day' WHERE email = 'test@example.com';

# Reset a test user to fresh trial
UPDATE profiles SET tier = 'trial', trial_expires_at = NOW() + INTERVAL '7 days' WHERE email = 'test@example.com';

# Simulate paid subscription
UPDATE profiles SET tier = 'pro', subscription_status = 'active' WHERE email = 'test@example.com';
```

---

## 14. Environment Configurations

### Development (.env.local)
```env
NEXT_PUBLIC_DEV_MODE=true
# All other env vars set but Polar in test mode
```

### Staging (.env.staging)
```env
NEXT_PUBLIC_DEV_MODE=false
# Polar test mode keys
# Supabase staging project
```

### Production (.env.production)
```env
NEXT_PUBLIC_DEV_MODE=false
# Polar live keys
# Supabase production project
```

---

*This document is the single source of truth for the subscription system implementation. All feature gating decisions should reference `lib/tiers.ts`. All tier resolution should go through `resolveEffectiveTier()`. All dev bypass should go through `isDevMode()`. No subscription logic should exist outside these boundaries.*
