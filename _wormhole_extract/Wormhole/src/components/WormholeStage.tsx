'use client';

import { JuliaWormholeBackdrop } from '@/components/JuliaWormholeBackdrop';
import { useScrollDepth } from '@/hooks/useScrollDepth';

export function WormholeStage() {
  useScrollDepth(true);
  return <JuliaWormholeBackdrop />;
}
