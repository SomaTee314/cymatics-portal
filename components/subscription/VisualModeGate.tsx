'use client';

import { useUser } from '@/context/UserContext';
import { isVisualModeAvailable } from '@/lib/tiers';

interface VisualModeGateProps {
  modeId: string;
  modeName: string;
  onSelect: () => void;
  children: React.ReactNode;
}

export function VisualModeGate({
  modeId,
  modeName,
  onSelect,
  children,
}: VisualModeGateProps) {
  const { effectiveTier, isDevMode, isAuthenticated } = useUser();

  if (isDevMode) {
    return (
      <div onClick={onSelect} onKeyDown={(e) => e.key === 'Enter' && onSelect()} role="presentation">
        {children}
      </div>
    );
  }

  const available = isVisualModeAvailable(effectiveTier, modeId);

  if (available) {
    return (
      <div onClick={onSelect} onKeyDown={(e) => e.key === 'Enter' && onSelect()} role="presentation">
        {children}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        window.location.href = isAuthenticated ? '/pricing' : '/signup';
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter')
          window.location.href = isAuthenticated ? '/pricing' : '/signup';
      }}
      className="group relative cursor-pointer"
    >
      <div className="blur-[2px] opacity-50">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="mb-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
          Unlock with Pro
        </span>
        <span className="text-[10px] text-white/60">{modeName}</span>
      </div>
    </div>
  );
}
