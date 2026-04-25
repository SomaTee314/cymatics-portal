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
      type="button"
      onClick={() => {
        window.location.href = isAuthenticated ? '/pricing' : '/signup';
      }}
      className="group relative cursor-pointer opacity-50 transition-opacity hover:opacity-70"
      title={`Unlock ${frequencyHz} Hz with Pro`}
    >
      {children}
      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
          Pro
        </span>
      </div>
    </button>
  );
}
