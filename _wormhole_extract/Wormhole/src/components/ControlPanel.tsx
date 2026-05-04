'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { tunnelStore, type TunnelState } from '@/tunnel/tunnelStore';

/**
 * Right-edge slide-out panel for live-tuning the wormhole.
 *
 * Collapsed: 32px chevron tab anchored vertically center on the right edge.
 * Expanded: 320px panel covers the right side of the viewport.
 *
 * `data-no-wheel` on the wrapper prevents wheel events from leaking through
 * to `useScrollDepth` while the user is interacting with sliders.
 */

const JULIA_PRESETS = [
  { id: 'rabbit', label: 'Douady Rabbit', cx: -0.7269, cy: 0.1889, frameZoom: 1.5 },
  { id: 'dendrite', label: 'Dendrite', cx: 0, cy: 1, frameZoom: 1.5 },
  { id: 'sanMarco', label: 'San Marco', cx: -0.75, cy: 0, frameZoom: 1.5 },
  { id: 'siegel', label: 'Siegel Disk', cx: -0.391, cy: -0.587, frameZoom: 1.5 },
  { id: 'recursive', label: 'Deep Recursive', cx: -0.8, cy: 0.156, frameZoom: 1.5 },
  { id: 'spiral', label: 'Spiral', cx: -0.4, cy: 0.6, frameZoom: 1.5 },
  { id: 'airplane', label: 'Airplane', cx: -1.755, cy: 0, frameZoom: 1.5 },
  { id: 'cauliflower', label: 'Cauliflower', cx: 0.285, cy: 0.01, frameZoom: 1.5 },
] as const;

function useStoreValue<T>(selector: (s: TunnelState) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const [value, setValue] = useState<T>(() => selector(tunnelStore.getState()));
  useEffect(() => {
    return tunnelStore.subscribe(() => {
      const next = selectorRef.current(tunnelStore.getState());
      setValue((prev) => (Object.is(prev, next) ? prev : next));
    });
  }, []);
  return value;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  decimals = 3,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  decimals?: number;
}): ReactElement {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <div className="flex items-center justify-between text-white/70">
        <span>{label}</span>
        <span className="font-mono text-white/90">{value.toFixed(decimals)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-fuchsia-400"
      />
    </label>
  );
}

export function ControlPanel(): ReactElement {
  const [open, setOpen] = useState(false);
  const [linkOmFractalSpeed, setLinkOmFractalSpeed] = useState(false);

  const idleForward = useStoreValue((s) => s.idleForward);
  const helixFlareGain = useStoreValue((s) => s.helixFlareGain);
  const bloomStrength = useStoreValue((s) => s.bloomStrength);
  const bloomRadius = useStoreValue((s) => s.bloomRadius);
  const bloomThreshold = useStoreValue((s) => s.bloomThreshold);
  const fogDensity = useStoreValue((s) => s.fogDensity);
  const juliaFrameZoom = useStoreValue((s) => s.juliaFrameZoom);
  const juliaPulseAmount = useStoreValue((s) => s.juliaPulseAmount);
  const juliaParallaxAmount = useStoreValue((s) => s.juliaParallaxAmount);
  const juliaRotationSpeed = useStoreValue((s) => s.juliaRotationSpeed);
  const juliaRidgeStrength = useStoreValue((s) => s.juliaRidgeStrength);
  const juliaCx = useStoreValue((s) => s.juliaCx);
  const juliaCy = useStoreValue((s) => s.juliaCy);
  const omStreamSpeed = useStoreValue((s) => s.omStreamSpeed);
  const fractalEvolutionSpeed = useStoreValue((s) => s.fractalEvolutionSpeed);

  const activePresetId =
    JULIA_PRESETS.find(
      (p) => Math.abs(p.cx - juliaCx) < 0.001 && Math.abs(p.cy - juliaCy) < 0.001,
    )?.id ?? null;

  return (
    <div
      data-no-wheel
      className={`fixed top-0 right-0 z-50 flex h-full transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : 'translate-x-[20rem]'
      }`}
    >
      {/* Tab handle — anchored to the panel so it slides with it */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close controls' : 'Open controls'}
        className="flex h-20 w-8 items-center justify-center self-center rounded-l-md border-y border-l border-white/15 bg-black/55 text-white/80 backdrop-blur-md transition hover:bg-black/75 hover:text-white"
      >
        <span className="text-base leading-none">{open ? '›' : '‹'}</span>
      </button>

      {/* Panel body */}
      <div className="h-full w-80 overflow-y-auto border-l border-white/10 bg-black/70 px-5 py-6 text-white/90 backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.28em] text-white/70">Controls</h2>
          <button
            type="button"
            onClick={() => tunnelStore.reset()}
            className="text-[10px] uppercase tracking-wider text-white/55 transition hover:text-white"
          >
            Reset
          </button>
        </div>

        {/* Julia preset */}
        <section className="mb-7">
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/50">
            Julia preset
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {JULIA_PRESETS.map((p) => {
              const active = activePresetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    tunnelStore.setState({
                      juliaCx: p.cx,
                      juliaCy: p.cy,
                      juliaFrameZoom: p.frameZoom,
                    })
                  }
                  className={`rounded-md border px-2.5 py-2 text-left text-[11px] transition ${
                    active
                      ? 'border-fuchsia-400/60 bg-fuchsia-400/10 text-white'
                      : 'border-white/10 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Motion */}
        <section className="mb-7 space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            Motion
          </h3>
          <Slider
            label="Idle drift"
            value={idleForward}
            min={0}
            max={3}
            step={0.05}
            decimals={2}
            onChange={(v) => tunnelStore.setState({ idleForward: v })}
          />
          <Slider
            label="Helix flare"
            value={helixFlareGain}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={(v) => tunnelStore.setState({ helixFlareGain: v })}
          />
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/65">
            <input
              type="checkbox"
              checked={linkOmFractalSpeed}
              onChange={(e) => {
                const on = e.target.checked;
                setLinkOmFractalSpeed(on);
                if (on) {
                  const st = tunnelStore.getState();
                  tunnelStore.setState({ omStreamSpeed: st.fractalEvolutionSpeed });
                }
              }}
              className="h-3.5 w-3.5 cursor-pointer rounded border-white/30 bg-black/40 accent-fuchsia-400"
            />
            <span>Link Om speed to fractal evolution</span>
          </label>
          {linkOmFractalSpeed ? (
            <Slider
              label="Scroll speed (Om + fractal)"
              value={fractalEvolutionSpeed}
              min={0}
              max={3}
              step={0.05}
              decimals={2}
              onChange={(v) =>
                tunnelStore.setState({ fractalEvolutionSpeed: v, omStreamSpeed: v })
              }
            />
          ) : (
            <>
              <Slider
                label="Om stream (× scroll)"
                value={omStreamSpeed}
                min={0}
                max={3}
                step={0.05}
                decimals={2}
                onChange={(v) => tunnelStore.setState({ omStreamSpeed: v })}
              />
              <Slider
                label="Fractal evolution (× scroll depth)"
                value={fractalEvolutionSpeed}
                min={0}
                max={3}
                step={0.05}
                decimals={2}
                onChange={(v) => tunnelStore.setState({ fractalEvolutionSpeed: v })}
              />
            </>
          )}
          <p className="text-[10px] leading-snug text-white/45">
            Motion still follows scroll and idle drift; these sliders only scale how strong the
            response is.
          </p>
        </section>

        {/* Skybox */}
        <section className="mb-7 space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            Skybox
          </h3>
          <Slider
            label="Pulse amount"
            value={juliaPulseAmount}
            min={0}
            max={0.5}
            step={0.01}
            decimals={2}
            onChange={(v) => tunnelStore.setState({ juliaPulseAmount: v })}
          />
          <Slider
            label="Parallax morph"
            value={juliaParallaxAmount}
            min={0}
            max={0.15}
            step={0.005}
            decimals={3}
            onChange={(v) => tunnelStore.setState({ juliaParallaxAmount: v })}
          />
          <Slider
            label="Rotation"
            value={juliaRotationSpeed}
            min={0}
            max={0.3}
            step={0.005}
            decimals={3}
            onChange={(v) => tunnelStore.setState({ juliaRotationSpeed: v })}
          />
          <Slider
            label="Ridge waves"
            value={juliaRidgeStrength}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={(v) => tunnelStore.setState({ juliaRidgeStrength: v })}
          />
        </section>

        {/* Bloom */}
        <section className="mb-7 space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            Bloom
          </h3>
          <Slider
            label="Strength"
            value={bloomStrength}
            min={0}
            max={2}
            step={0.01}
            decimals={2}
            onChange={(v) => tunnelStore.setState({ bloomStrength: v })}
          />
          <Slider
            label="Radius"
            value={bloomRadius}
            min={0}
            max={1.5}
            step={0.01}
            decimals={2}
            onChange={(v) => tunnelStore.setState({ bloomRadius: v })}
          />
          <Slider
            label="Threshold"
            value={bloomThreshold}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={(v) => tunnelStore.setState({ bloomThreshold: v })}
          />
        </section>

        {/* Atmosphere */}
        <section className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            Atmosphere
          </h3>
          <Slider
            label="Fog density"
            value={fogDensity}
            min={0}
            max={0.08}
            step={0.001}
            decimals={3}
            onChange={(v) => tunnelStore.setState({ fogDensity: v })}
          />
          <Slider
            label="Frame zoom"
            value={juliaFrameZoom}
            min={0.15}
            max={1.5}
            step={0.01}
            decimals={2}
            onChange={(v) => tunnelStore.setState({ juliaFrameZoom: v })}
          />
        </section>
      </div>
    </div>
  );
}
