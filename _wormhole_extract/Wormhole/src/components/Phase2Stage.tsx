'use client';

import { ScrollDiagnostic } from '@/components/ScrollDiagnostic';
import { useScrollDepth } from '@/hooks/useScrollDepth';

export function Phase2Stage() {
  useScrollDepth(true);
  return <ScrollDiagnostic />;
}
