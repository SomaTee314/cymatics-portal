'use client';

import { useUser } from '@/context/UserContext';
import { type TierFeatures, hasFeature } from '@/lib/tiers';
import { type ReactNode } from 'react';

interface FeatureGateProps {
  feature: keyof TierFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  softGate?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  softGate = false,
}: FeatureGateProps) {
  const { effectiveTier, isDevMode } = useUser();

  if (isDevMode) return <>{children}</>;

  const allowed = hasFeature(effectiveTier, feature);

  if (allowed) return <>{children}</>;

  if (softGate) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-60 blur-sm">
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

  const featureLabels: Partial<Record<keyof TierFeatures, string>> = {
    micInput: 'Microphone & track analysis',
    videoExport: 'Video export',
    resolution4k: '4K rendering',
    customFrequencyInput: 'Custom frequency dial',
    saveConfigs: 'Save configurations',
    customColourPalettes: 'Custom colour palettes',
    embedWidget: 'Embeddable widget',
    apiAccess: 'API access',
    commercialLicence: 'Commercial licence',
  };

  const label = featureLabels[feature] || 'This feature';

  return (
    <div className="max-w-sm rounded-xl border border-white/10 bg-black/80 p-6 text-center backdrop-blur-md">
      <div className="mb-2 text-xs uppercase tracking-widest text-white/60">
        Pro feature
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">Unlock {label}</h3>
      <p className="mb-4 text-sm text-white/50">
        {isAuthenticated
          ? 'Upgrade to Pro for full access.'
          : 'Sign up for free access to unlock this in the app.'}
      </p>
      <a
        href={isAuthenticated ? '/pricing' : '/signup'}
        className="inline-block rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
      >
        {isAuthenticated ? 'View plans' : 'Sign up for free access'}
      </a>
    </div>
  );
}
