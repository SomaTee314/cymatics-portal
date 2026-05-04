'use client';

export type ScrollMode = 'locked' | 'free';

export type TunnelState = {
  mode: ScrollMode;
  depth: number;
  velocity: number;
  sensitivity: number;
  friction: number;
  maxDepth: number;
  idleForward: number;
  juliaCx: number;
  juliaCy: number;
  /** Multiplier on |velocity| controlling how strongly helices brighten when scrolling. */
  helixFlareGain: number;
  /** Sample-region zoom for the framed Julia skybox. Smaller = wider view of the Julia. */
  juliaFrameZoom: number;
  /** Strength of zoom breathing on the framed Julia (sin modulation amplitude). */
  juliaPulseAmount: number;
  /** Magnitude of c-parameter shift coupled to the pulse. 0 = no morph, 0.1+ = strong. */
  juliaParallaxAmount: number;
  /** Sample-plane rotation rate (rad/sec). 0 = static, 0.1 ≈ full rotation per minute. */
  juliaRotationSpeed: number;
  /** Metallic ridge wave intensity. 0 = flat color blocks, 1 = strong embossed ridges. */
  juliaRidgeStrength: number;
  /**
   * Multiplier on Om tunnel drift vs scroll-depth (0 = no Om motion while scrolling).
   * Motion still comes only from scroll-driven depth changes.
   */
  omStreamSpeed: number;
  /**
   * Multiplier on how fast the Julia morphs along scroll depth (rings + skybox c/phases).
   * Idle uTime animation unchanged; depth-driven evolution scales with this.
   */
  fractalEvolutionSpeed: number;
  discRadius: number;
  tubeRadius: number;
  tubeLength: number;
  tubeRadialSegments: number;
  tubeLengthSegments: number;
  ringCount: number;
  ringSpacing: number;
  helixCount: number;
  particleCount: number;
  fogDensity: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  tubeRepeat: number;
  twist: number;
  ringRadius: number;
  intensity: number;
  iters: number;
  zoomRate: number;
  holeRadius: number;
  spiralPhase: number;
  paletteOffset: number;
  colorIntensity: number;
};

export const TUNNEL_INITIAL: TunnelState = {
  mode: 'locked',
  depth: 0,
  velocity: 0,
  sensitivity: 0.0015,
  friction: 0.92,
  maxDepth: 1000000000,
  idleForward: 1.0,
  juliaCx: -0.7269,
  juliaCy: 0.1889,
  helixFlareGain: 1.0,
  juliaFrameZoom: 1.5,
  juliaPulseAmount: 0.1,
  juliaParallaxAmount: 0.04,
  juliaRotationSpeed: 0.085,
  juliaRidgeStrength: 0.09,
  omStreamSpeed: 0.05,
  fractalEvolutionSpeed: 3.0,
  discRadius: 0.24,
  tubeRadius: 6,
  tubeLength: 240,
  tubeRadialSegments: 128,
  tubeLengthSegments: 320,
  ringCount: 72,
  ringSpacing: 4,
  helixCount: 3,
  particleCount: 2400,
  fogDensity: 0.02,
  bloomStrength: 0.0,
  bloomRadius: 0.0,
  bloomThreshold: 0.0,
  tubeRepeat: 1.0,
  twist: 14.0,
  ringRadius: 8,
  intensity: 1.15,
  iters: 200,
  zoomRate: 0.25,
  holeRadius: 0.28,
  spiralPhase: 0,
  paletteOffset: 0,
  colorIntensity: 0.62,
};

export const INITIAL = TUNNEL_INITIAL;

let state: TunnelState = { ...TUNNEL_INITIAL };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((fn) => fn());
}

export function getState(): TunnelState {
  return state;
}

export function setState(partial: Partial<TunnelState>): void {
  state = { ...state, ...partial };
  emit();
}

export function reset(): void {
  state = { ...TUNNEL_INITIAL };
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const tunnelStore = {
  getState,
  setState,
  subscribe,
  reset,
};
