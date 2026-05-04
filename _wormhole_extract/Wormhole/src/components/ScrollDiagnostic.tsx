'use client';

import { useEffect, useState } from 'react';

import { getState, subscribe } from '@/tunnel/tunnelStore';

export function ScrollDiagnostic() {
  const [snap, setSnap] = useState(getState);

  useEffect(() => {
    setSnap(getState());
    return subscribe(() => setSnap(getState()));
  }, []);

  return (
    <div
      className="fixed right-4 top-4 z-[100] rounded-md bg-white/30 px-3 py-2 font-mono text-sm text-zinc-950 shadow-lg backdrop-blur-md"
      data-no-wheel
    >
      <div>mode = {snap.mode}</div>
      <div>depth = {snap.depth.toFixed(3)}</div>
      <div>velocity = {snap.velocity.toFixed(3)}</div>
    </div>
  );
}
