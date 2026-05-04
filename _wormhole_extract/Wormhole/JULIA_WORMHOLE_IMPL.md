# Julia Wormhole — implementation

Every source file in the project, embedded verbatim. Pasting these files into a
fresh Next.js workspace produces a byte-identical project.

This document is the **source of truth** for the codebase. If you change a
file in the repo and don't update the corresponding fence here, the next time
someone clones from the IMPL doc they'll get drift. The files are listed in
**dependency order** — config → store → shaders → component → shell — so you
can paste them in sequence without forward references.

For *why* each file is structured the way it is, see `JULIA_WORMHOLE_PLAN.md`.
For phased Cursor prompts that build the project from scratch, see
`CURSOR_PROMPTS.md`.

---

## File tree

```
julia-wormhole/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.mjs
├── postcss.config.mjs
├── .eslintrc.json
├── .gitignore
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── globals.css
    ├── tunnel/
    │   └── tunnelStore.ts
    ├── hooks/
    │   └── useScrollDepth.ts
    ├── visuals/
    │   └── shaders/
    │       └── juliaWormholeShaders.ts
    └── components/
        ├── JuliaWormholeBackdrop.tsx
        ├── WormholeStage.tsx
        └── HeroOverlay.tsx
```

---

## `package.json`

Pin Next 14, React 18.3, Three 0.170 — proven combo. No external state lib, no R3F, no Lenis. `transpilePackages: ['three']` in `next.config.mjs` lets us import from `three/examples/jsm/postprocessing/*` cleanly.

````json
{
  "name": "julia-wormhole",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.2.28",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "0.170.0"
  },
  "devDependencies": {
    "@types/node": "^20.17.30",
    "@types/react": "^18.3.20",
    "@types/react-dom": "^18.3.6",
    "@types/three": "0.170.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.28",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3"
  }
}
````

---

## `tsconfig.json`

Strict TS, ES2017 target, `@/*` → `./src/*`.

````json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
````

---

## `next.config.mjs`

Minimal — just `transpilePackages` for the three.js subpath imports.

````js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three'],
  reactStrictMode: true,
};

export default nextConfig;
````

---

## `tailwind.config.mjs`

Tailwind 3, scans `src/**`.

````js
/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
````

---

## `postcss.config.mjs`

Standard Tailwind PostCSS chain.

````js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
````

---

## `.eslintrc.json`

Next core-web-vitals only.

````json
{
  "extends": "next/core-web-vitals"
}
````

---

## `.gitignore`

Standard Next.js ignore set.

````gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/
/build

# production
/dist

# misc
.DS_Store
*.pem
.vscode

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# local env files
.env*.local
.env

# typescript
*.tsbuildinfo
next-env.d.ts
````

---

## `src/app/layout.tsx`

Root layout — minimal, no SEO bloat. Just metadata + viewport + globals.css.

````tsx
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Julia Wormhole',
  description:
    'A scroll-driven journey through the 360° interior of a Julia fractal wormhole.',
};

export const viewport: Viewport = {
  themeColor: '#020204',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
````

---

## `src/app/page.tsx`

Server component renders `<WormholeStage />`. WormholeStage is the client boundary.

````tsx
import { WormholeStage } from '@/components/WormholeStage';

export default function Home() {
  return <WormholeStage />;
}
````

---

## `src/app/globals.css`

Black background, scroll-locked class flips overflow when the wormhole is active (set by `useScrollDepth`).

````css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

html,
body {
  height: 100%;
}

html {
  overflow-x: hidden;
  overflow-y: auto;
}

body {
  @apply bg-[#020204] text-zinc-100 antialiased;
  overflow-x: hidden;
  overflow-y: auto;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

/* Wormhole locks page scroll while wheel feeds tunnelStore.depth instead. */
html.scroll-locked,
html.scroll-locked body {
  overflow: hidden;
  height: 100%;
  overscroll-behavior: none;
}

/* Don't show a scrollbar in any case; our scroll handler is virtual. */
::-webkit-scrollbar {
  width: 0;
  background: transparent;
}
````

---

## `src/tunnel/tunnelStore.ts`

Vanilla pub/sub store. ~120 lines including types. `getState`, `setState`, `reset`, `subscribe`. Read inside RAFs via `tunnelStore.getState()` — zero React re-renders for per-frame updates. All wormhole knobs live here so the scene can be tuned without touching the component.

````ts
'use client';

/**
 * Lightweight tunnel state — vanilla pub/sub, no external runtime dep.
 * Read inside RAF loops via `tunnelStore.getState()` (zero React re-renders
 * for per-frame uniform / camera updates).
 */
export type ScrollMode = 'locked' | 'free';

export type TunnelState = {
  // Scroll mode + integration
  mode: ScrollMode;
  /** Accumulated scroll depth (units along tube). Drives shader uDepth + camera Z. */
  depth: number;
  /** Current scroll-driven velocity (units/sec). */
  velocity: number;
  /** Wheel impulse → velocity scale. */
  sensitivity: number;
  /** Per-frame velocity decay coefficient (free mode). */
  friction: number;
  /** Upper clamp for `depth`. */
  maxDepth: number;
  /** Locked-mode forward drift units/sec when |velocity| ≈ 0. 0 disables. */
  idleForward: number;

  // Julia c orbit (canonical Cymatics holo c)
  juliaCx: number;
  juliaCy: number;
  /** Radius of c-orbit disc — controls how far the Julia structure morphs. */
  discRadius: number;

  // Wormhole geometry
  /** Tube radius (units in scene). */
  tubeRadius: number;
  /** Tube total length (camera Z travels through this range, looping). */
  tubeLength: number;
  /** Tube radial segments (smoothness around the cylinder). */
  tubeRadialSegments: number;
  /** Tube length segments (vertex resolution along axis — curvature smoothness). */
  tubeLengthSegments: number;

  // Accent layers
  ringCount: number;
  ringSpacing: number;
  helixCount: number;
  particleCount: number;

  // Atmosphere
  fogDensity: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;

  // Shader knobs
  /** How many fractal "depth bands" wrap the tube length. Higher → busier flow. */
  tubeRepeat: number;
  /** Helical twist factor — couples angle and depth in the shader. */
  twist: number;
  /** Sample radius in complex plane — controls fractal "zoom" on the tube wall. */
  ringRadius: number;
  /** Tonemap exposure on tube fragment. */
  intensity: number;
};

const INITIAL: TunnelState = {
  mode: 'locked',
  depth: 0,
  velocity: 0,
  sensitivity: 0.0015,
  friction: 0.92,
  maxDepth: 1024,
  idleForward: 0.6,

  juliaCx: -0.7269,
  juliaCy: 0.1889,
  discRadius: 0.172,

  tubeRadius: 6,
  tubeLength: 240,
  tubeRadialSegments: 128,
  tubeLengthSegments: 320,

  ringCount: 12,
  ringSpacing: 18,
  helixCount: 3,
  particleCount: 1800,

  fogDensity: 0.018,
  bloomStrength: 0.95,
  bloomRadius: 0.85,
  bloomThreshold: 0.18,

  tubeRepeat: 4.5,
  twist: 0.55,
  ringRadius: 1.5,
  intensity: 1.0,
};

let state: TunnelState = { ...INITIAL };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const tunnelStore = {
  getState(): TunnelState {
    return state;
  },
  setState(partial: Partial<TunnelState>): void {
    state = { ...state, ...partial };
    emit();
  },
  reset(): void {
    state = { ...INITIAL };
    emit();
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

export const TUNNEL_INITIAL = INITIAL;
````

---

## `src/hooks/useScrollDepth.ts`

Wheel / touch / keyboard → store. Two modes (locked, free). 60-second exponential coast decay. Idle drift forward in locked mode. Cross-input normalisation. Visibility pause. Wraps `depth` at `maxDepth` so flight is endless.

````ts
'use client';

import { useEffect, useRef } from 'react';

import { tunnelStore } from '@/tunnel/tunnelStore';

const TOUCH_MULTIPLIER = 2.5;
const KEY_DELTA = 5;

/** Wheel impulse decays with ~this e-folding time so motion lingers. */
const SCROLL_COAST_TAU_SEC = 60;
const LOCKED_VEL_MAX = 140;
const FREE_VEL_MAX = 45;

function normalizeWheel(e: WheelEvent): number {
  if (e.ctrlKey) return 0; // pinch-zoom — ignore
  let pY = e.deltaY;
  if (e.deltaMode === 1) pY *= 40; // line
  else if (e.deltaMode === 2) pY *= 800; // page
  return Math.max(-100, Math.min(100, pY));
}

/**
 * Maps wheel / touch / keys → `tunnelStore.depth` + `velocity`.
 *
 * Two modes:
 * - **locked**: scroll feeds velocity, ~60s coast, gentle idle drift forward.
 *   Native page scroll is disabled (CSS handles it via .scroll-locked class).
 * - **free**: scroll directly impulses velocity, friction-decayed, depth wraps
 *   at `maxDepth` (camera flies through the tunnel forever).
 *
 * Toggle modes with `L` key. Home/End jump to start/end of depth range.
 */
export function useScrollDepth(enabled: boolean): void {
  const wheelAccumRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef(performance.now());
  const currentDepthRef = useRef(0);
  const currentVelocityRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // Initial sync from store (allows external resets)
    const syncFromStore = () => {
      const s = tunnelStore.getState();
      currentDepthRef.current = s.depth;
      currentVelocityRef.current = s.velocity;
    };
    syncFromStore();
    const unsub = tunnelStore.subscribe(syncFromStore);

    // CSS scroll-lock toggle so the document doesn't bounce while scrolling the tube
    const applyScrollLockClass = () => {
      const m = tunnelStore.getState().mode;
      document.documentElement.classList.toggle(
        'scroll-locked',
        m === 'locked' || m === 'free',
      );
    };
    applyScrollLockClass();

    const onWheel = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('[data-no-wheel]')) return;
      e.preventDefault();
      wheelAccumRef.current += normalizeWheel(e);
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) lastTouchYRef.current = t.clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      wheelAccumRef.current += (lastTouchYRef.current - t.clientY) * TOUCH_MULTIPLIER;
      lastTouchYRef.current = t.clientY;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const s = tunnelStore.getState();
      switch (e.key) {
        case 'l':
        case 'L':
          tunnelStore.setState({ mode: s.mode === 'locked' ? 'free' : 'locked' });
          applyScrollLockClass();
          break;
        case 'ArrowDown':
        case 'PageDown':
          if (s.mode === 'free') wheelAccumRef.current += KEY_DELTA * 20;
          else currentVelocityRef.current += KEY_DELTA * 1.1;
          break;
        case 'ArrowUp':
        case 'PageUp':
          if (s.mode === 'free') wheelAccumRef.current -= KEY_DELTA * 20;
          else currentVelocityRef.current -= KEY_DELTA * 1.1;
          break;
        case 'Home':
          tunnelStore.setState({ depth: 0, velocity: 0 });
          break;
        case 'End': {
          const cap = tunnelStore.getState().maxDepth;
          tunnelStore.setState({ depth: cap, velocity: 0 });
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);

    const tick = (t: number) => {
      const raw = (t - lastTRef.current) / 1000;
      const dt = Math.min(Math.max(raw, 1 / 240), 0.05);
      lastTRef.current = t;

      const s = tunnelStore.getState();
      const maxDepth = Math.max(1, s.maxDepth);
      const coast = Math.exp(-dt / SCROLL_COAST_TAU_SEC);

      if (s.mode === 'free') {
        const impulse = wheelAccumRef.current * s.sensitivity;
        wheelAccumRef.current = 0;
        let v = currentVelocityRef.current + impulse;
        v = Math.max(-FREE_VEL_MAX, Math.min(FREE_VEL_MAX, v));
        let d = currentDepthRef.current + v * dt;
        // Wrap so the journey never ends — fly forever
        if (d >= maxDepth) d -= maxDepth;
        if (d < 0) d += maxDepth;
        v *= coast * Math.pow(s.friction, dt * 8);
        currentDepthRef.current = d;
        currentVelocityRef.current = v;
        tunnelStore.setState({ depth: d, velocity: v });
      } else {
        const impulse = wheelAccumRef.current * s.sensitivity * 0.35;
        wheelAccumRef.current = 0;
        let v = currentVelocityRef.current + impulse;
        v = Math.max(-LOCKED_VEL_MAX, Math.min(LOCKED_VEL_MAX, v));
        // Idle forward drift if not scrolling
        if (s.idleForward > 0 && Math.abs(v) < 0.08) {
          v = s.idleForward;
        }
        let d = currentDepthRef.current + v * dt;
        if (d >= maxDepth) d -= maxDepth;
        if (d < 0) d += maxDepth;
        v *= coast;
        currentDepthRef.current = d;
        currentVelocityRef.current = v;
        tunnelStore.setState({ depth: d, velocity: v });
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (rafRef.current === null) {
        lastTRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      unsub();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.documentElement.classList.remove('scroll-locked');
    };
  }, [enabled]);
}
````

---

## `src/visuals/shaders/juliaWormholeShaders.ts`

GLSL strings as TS template literals. Two material modes share the shader: `uMode = 0` is the inner tube (sample on a circle of complex space → seamless 360° wrap), `uMode = 1` is the skybox (centred 2D Julia, slow drift). 96 max iterations, smooth iter count, IQ palette, tonemap shoulder, longitudinal vignette, velocity flare. **The cylinder-circle mapping is what makes the wraparound seam invisible** — see `JULIA_WORMHOLE_PLAN.md` §3.

````ts
/**
 * GLSL sources for the Julia Wormhole.
 *
 * Two material configurations share the same shader:
 *
 *   1. **Inner tube** (`uMode = 0`): mapped to the interior surface of a
 *      `CylinderGeometry` rendered with `BackSide`. The viewer is *inside* this
 *      cylinder. UVs come straight from the geometry — `vUv.x` wraps the angle
 *      seamlessly around the tube, `vUv.y` runs the tube's length. We sample
 *      the complex plane along a circle whose radius breathes with depth and
 *      whose orientation twists helically — producing a perfectly seamless,
 *      depth-evolving fractal that reads as "moving through" the Julia in 360°.
 *
 *   2. **Skybox** (`uMode = 1`): mapped to a large `SphereGeometry` rendered
 *      with `BackSide`, slow time multiplier, low intensity. Visible at the
 *      far end of the tube, dissolving into fog.
 *
 * Smooth iteration count + IQ cosine palette + tonemap shoulder give clean
 * neon gradients without banding even at the highest fragment density.
 */

export const wormholeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const wormholeFragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uDepth;
  uniform float uVelocity;

  uniform vec2  uCenter;       // base Julia c (e.g. -0.7269, 0.1889)
  uniform float uDiscRadius;   // radius of c-orbit disc

  uniform float uTubeRepeat;   // depth bands per tube length
  uniform float uTwist;        // helical twist factor
  uniform float uRingRadius;   // sample radius in complex plane
  uniform float uIntensity;    // tonemap exposure
  uniform float uMode;         // 0 tube, 1 sky

  // Inigo Quilez cosine palette (https://iquilezles.org/articles/palettes/)
  vec3 palette(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.55);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318530718 * (c * t + d));
  }

  void main() {
    // ── Map cylinder UV → complex-plane sample point ──────────────────────
    //
    //  vUv.x in [0,1] → angle (seamless wrap)
    //  vUv.y in [0,1] → along-tube position (scrolls with depth)
    //
    // For the SKY (mode 1) we want a static-ish 2D fractal — use centred (vUv-0.5).
    // For the TUBE (mode 0) we sample on a circle in C; this guarantees the
    // wrap-around seam at vUv.x=0=1 is literally the same complex point.

    vec2 z0;
    float along;

    if (uMode > 0.5) {
      // Skybox: classic centred 2D Julia
      vec2 p = (vUv - 0.5) * 2.0;
      z0 = p / 0.55;
      along = uDepth * 0.05;
    } else {
      // Tube: angular wrap
      float angle = vUv.x * 6.28318530718;
      along = vUv.y * uTubeRepeat - uDepth * 0.04;

      // Helical twist couples the two coordinates so the fractal "spirals" past
      float twistedAngle = angle + along * uTwist;

      // Breathing sample radius so different depth bands fall on different
      // orbits in C-space (gives genuine evolution, not just rotation).
      float r = uRingRadius * (1.0 + 0.18 * sin(along * 0.6));

      z0 = vec2(cos(twistedAngle), sin(twistedAngle)) * r;

      // Slow drift of the centre by along — different depth bands land on
      // slightly different parts of the complex plane.
      z0 += vec2(0.06 * sin(along * 0.31), 0.06 * cos(along * 0.27));
    }

    // ── Animate Julia c ────────────────────────────────────────────────────
    // c orbits a small disc; phase combines time + along so structure morphs
    // both temporally and as you fly forward.
    float ph1 = uTime * 0.11 + along * 0.18;
    float ph2 = uTime * 0.13 + along * 0.16;
    vec2 c = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));

    // ── Escape-time iteration ──────────────────────────────────────────────
    const int MAX_ITERS = 96;
    const float B = 64.0;
    vec2 z = z0;
    float m2 = dot(z, z);
    float n  = 0.0;
    for (int i = 0; i < MAX_ITERS; i++) {
      if (m2 > B * B) break;
      z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
      m2 = dot(z, z);
      n += 1.0;
    }
    // Smooth iteration count — kills cosine-palette banding (IQ).
    float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;

    // ── Colour ─────────────────────────────────────────────────────────────
    float t = 0.04 * sn + 0.06 * along + 0.02 * uDepth;
    vec3 col = palette(t);

    // Brighten escaped regions — the bright filaments
    float escaped = step(B * B, m2);
    col *= mix(0.18, 1.6, escaped);

    // Tonemap shoulder — squashes hot pixels into smooth highlights
    col = 1.0 - exp(-col * uIntensity);

    // Tube-only longitudinal vignette: darken the tube ends so the camera
    // always sees a "lit forward" interior; depth feels infinite.
    if (uMode < 0.5) {
      float vy = vUv.y;
      float vignette = smoothstep(0.0, 0.12, vy) * smoothstep(1.0, 0.88, vy);
      col *= vignette;
    }

    // Velocity flare — gentle motion-energy glow when scrolling fast
    col += abs(uVelocity) * 0.0035 * col;

    gl_FragColor = vec4(col, 1.0);
  }
`;
````

---

## `src/components/JuliaWormholeBackdrop.tsx`

The whole Three.js scene in one component. Renderer + scene + camera + BackSide cylinder + accent rings + helices + particles + skybox + stars + fog + EffectComposer with UnrealBloom + paranoid disposal. Mobile clamps applied at build time; reduced-motion checked once and respected throughout the RAF.

````tsx
'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { tunnelStore } from '@/tunnel/tunnelStore';
import {
  wormholeFragment,
  wormholeVertex,
} from '@/visuals/shaders/juliaWormholeShaders';

const PALETTE = [
  new THREE.Color('#ff4da8'),
  new THREE.Color('#8e3bff'),
  new THREE.Color('#3b7bff'),
  new THREE.Color('#4dffb0'),
  new THREE.Color('#f5ff61'),
];

type ShaderMode = 0 | 1;

/**
 * The Julia Wormhole scene.
 *
 * Architecture:
 *
 *   • **Inner tube** — `CylinderGeometry` rendered with `BackSide`. The whole
 *     360° interior is painted with the Julia fractal via cylindrical UVs.
 *     This is the user's primary visual experience.
 *   • **Accent rings** — sparse, bright, additive-blended discs at intervals
 *     along the tube. Provide depth landmarks; their parallax sells "motion".
 *   • **Helices** — three neon CatmullRom tubes spiralling through the
 *     cylinder's interior space.
 *   • **Particles** — drifting points; speed-line cues during fast scroll.
 *   • **Skybox** — sphere visible at the far end, dissolving into fog.
 *   • **Stars** — `THREE.Points` on a sphere just inside the skybox.
 *   • **Postprocessing** — EffectComposer → RenderPass → UnrealBloomPass →
 *     OutputPass. Bloom strength/radius/threshold all live-tunable from store.
 *
 * Camera sits at z=0 looking down -Z. Scroll-driven `depth` is read each
 * frame from `tunnelStore` and translates the camera in -Z; the tube wraps
 * (camera position modulo tube length) so flight is endless.
 */
export function JuliaWormholeBackdrop(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initial = tunnelStore.getState();

    // Detect mobile + reduced motion BEFORE building geometry so we can clamp
    const isMobile =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(pointer: coarse)').matches &&
      matchMedia('(hover: none)').matches;
    const reducedMotion =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ringCount = isMobile ? Math.min(initial.ringCount, 6) : initial.ringCount;
    const particleCount = isMobile
      ? Math.min(initial.particleCount, 700)
      : initial.particleCount;
    const tubeRadialSegments = isMobile
      ? Math.min(initial.tubeRadialSegments, 96)
      : initial.tubeRadialSegments;
    const tubeLengthSegments = isMobile
      ? Math.min(initial.tubeLengthSegments, 200)
      : initial.tubeLengthSegments;
    const bloomStrength = isMobile
      ? Math.min(initial.bloomStrength, 0.6)
      : initial.bloomStrength;

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.NoToneMapping; // OutputPass handles tone mapping
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
    });

    // ── Scene + camera ───────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05010f, initial.fogDensity);

    const camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.1,
      600,
    );
    camera.position.set(0, 0, 0);

    // ── Material factory ─────────────────────────────────────────────────
    const makeMat = (mode: ShaderMode) =>
      new THREE.ShaderMaterial({
        vertexShader: wormholeVertex,
        fragmentShader: wormholeFragment,
        side: THREE.BackSide,
        fog: false, // shader bakes its own vignette / depth feel
        uniforms: {
          uTime: { value: 0 },
          uDepth: { value: 0 },
          uVelocity: { value: 0 },
          uCenter: { value: new THREE.Vector2(initial.juliaCx, initial.juliaCy) },
          uDiscRadius: { value: initial.discRadius },
          uTubeRepeat: { value: initial.tubeRepeat },
          uTwist: { value: initial.twist },
          uRingRadius: { value: initial.ringRadius },
          uIntensity: { value: initial.intensity },
          uMode: { value: mode },
        },
      });

    // ── Inner tube (the heart of the experience) ─────────────────────────
    //
    // CylinderGeometry has its axis along local Y. We rotate -90° around X
    // so the axis aligns with -Z. After rotation, the camera (at origin
    // looking -Z) finds itself inside the tube. With BackSide rendering, we
    // see the interior surface from inside.
    //
    // UVs from CylinderGeometry: vUv.x wraps the angular axis (seamless),
    // vUv.y goes along the cylinder's axis. After rotation this is exactly
    // what the shader expects.
    //
    // The cylinder is centred at z = -tubeLength/2 so its near end is at
    // z = 0 (where the camera starts) and its far end is at z = -tubeLength.
    const tubeMat = makeMat(0);
    const tubeGeo = new THREE.CylinderGeometry(
      initial.tubeRadius,
      initial.tubeRadius,
      initial.tubeLength,
      tubeRadialSegments,
      tubeLengthSegments,
      true, // openEnded
    );
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.z = -initial.tubeLength / 2;
    scene.add(tube);

    // ── Skybox (dissolves into fog at far end) ───────────────────────────
    const skyMat = makeMat(1);
    skyMat.uniforms.uIntensity.value = 0.4;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 32), skyMat);
    scene.add(sky);

    // ── Stars (just inside the sky) ──────────────────────────────────────
    const STAR_COUNT = isMobile ? 600 : 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starCol = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 380 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      const tint = PALETTE[Math.floor(Math.random() * PALETTE.length)] as THREE.Color;
      starCol[i * 3] = tint.r;
      starCol[i * 3 + 1] = tint.g;
      starCol[i * 3 + 2] = tint.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 1.2,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    scene.add(stars);

    // ── Accent rings ─────────────────────────────────────────────────────
    // Sparse, bright, additive-blended — they're depth landmarks that read
    // as "ring after ring" parallax cues. Use the SAME shader (mode 0) so
    // their fractal pattern is a thin slice consistent with the tube wall.
    const rings: THREE.Mesh[] = [];
    const ringMats: THREE.ShaderMaterial[] = [];
    for (let i = 0; i < ringCount; i++) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: wormholeVertex,
        fragmentShader: wormholeFragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uDepth: { value: 0 },
          uVelocity: { value: 0 },
          uCenter: { value: new THREE.Vector2(initial.juliaCx, initial.juliaCy) },
          uDiscRadius: { value: initial.discRadius },
          uTubeRepeat: { value: 1.0 },
          uTwist: { value: 0.0 },
          uRingRadius: { value: 1.4 + (i % 5) * 0.12 },
          uIntensity: { value: 1.0 },
          uMode: { value: 0 },
        },
      });
      ringMats.push(mat);
      const geo = new THREE.RingGeometry(
        initial.tubeRadius * 0.78,
        initial.tubeRadius * 0.96,
        96,
        1,
      );
      const mesh = new THREE.Mesh(geo, mat);
      // Distribute rings evenly along tube length
      mesh.position.z = -((i + 0.5) / ringCount) * initial.tubeLength;
      mesh.rotation.z = (i * 0.41) % (Math.PI * 2);
      mesh.userData.spin = 0.18 + (i % 7) * 0.022;
      mesh.userData.baseZ = mesh.position.z;
      rings.push(mesh);
      scene.add(mesh);
    }

    // ── Helices ──────────────────────────────────────────────────────────
    const helices: THREE.Mesh[] = [];
    const HELIX_PTS = 800;
    const HELIX_TWISTS = 6;
    for (let h = 0; h < initial.helixCount; h++) {
      const phaseOffset = (h / initial.helixCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= HELIX_PTS; i++) {
        const t = i / HELIX_PTS;
        const z = -t * initial.tubeLength;
        const radius = initial.tubeRadius * 0.78 + Math.sin(t * 18) * 0.4;
        const angle = phaseOffset + t * Math.PI * 2 * HELIX_TWISTS;
        points.push(
          new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z),
        );
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeoH = new THREE.TubeGeometry(curve, HELIX_PTS, 0.06, 8, false);
      const colour = PALETTE[h % PALETTE.length] as THREE.Color;
      const mat = new THREE.MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: true,
      });
      const mesh = new THREE.Mesh(tubeGeoH, mat);
      mesh.userData.basePhase = phaseOffset;
      helices.push(mesh);
      scene.add(mesh);
    }

    // ── Particles ────────────────────────────────────────────────────────
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pCol = new Float32Array(particleCount * 3);
    const pPh = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * initial.tubeRadius * 0.9;
      const z = -Math.random() * initial.tubeLength;
      pPos[i * 3] = Math.cos(theta) * r;
      pPos[i * 3 + 1] = Math.sin(theta) * r;
      pPos[i * 3 + 2] = z;
      const tint = PALETTE[Math.floor(Math.random() * PALETTE.length)] as THREE.Color;
      pCol[i * 3] = tint.r;
      pCol[i * 3 + 1] = tint.g;
      pCol[i * 3 + 2] = tint.b;
      pPh[i] = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute('phase', new THREE.BufferAttribute(pPh, 1));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.16,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: true,
      }),
    );
    scene.add(particles);

    // ── Postprocessing ───────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength,
      initial.bloomRadius,
      initial.bloomThreshold,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ── Resize ───────────────────────────────────────────────────────────
    let resizePending = false;
    const onResize = () => {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        resizePending = false;
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // ── RAF ──────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;

    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const s = tunnelStore.getState();

      // Camera flies down -Z; loop within tubeLength so journey is endless.
      // We DON'T reposition the tube — we let camera Z mod into [-tubeLength, 0].
      const cz = -((s.depth % s.tubeLength) + s.tubeLength) % s.tubeLength;
      camera.position.z = cz;
      // Subtle camera roll based on velocity for motion personality
      if (!reducedMotion) {
        camera.rotation.z = Math.sin(time * 0.21) * 0.04 + s.velocity * 0.0015;
      }

      // Tube uniforms
      tubeMat.uniforms.uTime.value = reducedMotion ? 0 : time;
      tubeMat.uniforms.uDepth.value = s.depth;
      tubeMat.uniforms.uVelocity.value = s.velocity;
      tubeMat.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
      tubeMat.uniforms.uDiscRadius.value = s.discRadius;
      tubeMat.uniforms.uTubeRepeat.value = s.tubeRepeat;
      tubeMat.uniforms.uTwist.value = s.twist;
      tubeMat.uniforms.uRingRadius.value = s.ringRadius;
      tubeMat.uniforms.uIntensity.value = s.intensity;

      // Sky uniforms — slow drift, dark
      skyMat.uniforms.uTime.value = reducedMotion ? 0 : time * 0.4;
      skyMat.uniforms.uDepth.value = s.depth * 0.05;
      skyMat.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
      skyMat.uniforms.uDiscRadius.value = s.discRadius;

      // Accent rings: keep them roughly in front of camera by recycling Z,
      // but ALSO let them drift backward (tube length wraps with camera).
      for (const ring of rings) {
        // Rings are static in world Z — the camera moves past them. To make
        // them appear endlessly along the path, recycle: when the camera has
        // passed beyond a ring (ring.z > cz + 5), push it ahead by tubeLength.
        const relZ = ring.position.z - cz;
        if (relZ > 5) ring.position.z -= s.tubeLength;
        else if (relZ < -s.tubeLength + 5) ring.position.z += s.tubeLength;

        if (!reducedMotion) {
          const distFactor = THREE.MathUtils.clamp(-relZ / s.tubeLength, 0, 1);
          const spinRate =
            (ring.userData.spin as number) * (0.6 + distFactor * 1.8) +
            s.velocity * 0.04;
          ring.rotation.z += spinRate * dt;
        }
      }

      // Ring uniforms
      for (const m of ringMats) {
        m.uniforms.uTime.value = reducedMotion ? 0 : time;
        m.uniforms.uDepth.value = s.depth;
        m.uniforms.uVelocity.value = s.velocity;
        m.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
        m.uniforms.uDiscRadius.value = s.discRadius;
      }

      // Helices breathe + flare
      for (const h of helices) {
        if (!reducedMotion) {
          h.rotation.z =
            time * 0.18 + (h.userData.basePhase as number) * 0.3 + s.depth * 0.04;
        }
        const flare = Math.min(Math.abs(s.velocity) * 0.08, 0.35);
        const hm = h.material as THREE.MeshBasicMaterial;
        hm.opacity = 0.85 + flare;
      }

      // Particles drift + recycle
      const positions = pGeo.attributes.position!.array as Float32Array;
      const phases = pGeo.attributes.phase!.array as Float32Array;
      const dz = s.velocity * dt * 12;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 2] += dz;
        const camZ = cz;
        // Keep particles within [camZ - tubeLength, camZ + 5]
        if (positions[i * 3 + 2] > camZ + 5) positions[i * 3 + 2] -= s.tubeLength;
        else if (positions[i * 3 + 2] < camZ - s.tubeLength + 5)
          positions[i * 3 + 2] += s.tubeLength;
        if (!reducedMotion) {
          const x = positions[i * 3]!;
          const y = positions[i * 3 + 1]!;
          const angSpeed = 0.04 + phases[i]! * 0.002;
          const cs = Math.cos(angSpeed * dt);
          const sn = Math.sin(angSpeed * dt);
          positions[i * 3] = x * cs - y * sn;
          positions[i * 3 + 1] = x * sn + y * cs;
        }
      }
      pGeo.attributes.position!.needsUpdate = true;

      // Stars: slow rotate, follow camera so they don't drift away
      stars.position.z = cz;
      sky.position.z = cz;
      if (!reducedMotion) stars.rotation.z = time * 0.005;

      // Live atmosphere + bloom tuning
      bloom.strength = reducedMotion ? s.bloomStrength * 0.7 : s.bloomStrength;
      bloom.radius = s.bloomRadius;
      bloom.threshold = s.bloomThreshold;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = s.fogDensity;
      }

      composer.render(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Visibility pause — clear the delta on resume so we don't snap forward
    const onVis = () => {
      if (document.visibilityState === 'visible') clock.getDelta();
    };
    document.addEventListener('visibilitychange', onVis);

    // Context loss handling — bail clean; React remount restores
    const canvasEl = renderer.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
    };
    canvasEl.addEventListener('webglcontextlost', onContextLost);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVis);
      canvasEl.removeEventListener('webglcontextlost', onContextLost);
      composer.dispose();
      tubeGeo.dispose();
      tubeMat.dispose();
      for (const r of rings) {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      }
      for (const h of helices) {
        h.geometry.dispose();
        (h.material as THREE.Material).dispose();
      }
      pGeo.dispose();
      (particles.material as THREE.Material).dispose();
      starGeo.dispose();
      (stars.material as THREE.Material).dispose();
      sky.geometry.dispose();
      skyMat.dispose();
      renderer.dispose();
      if (canvasEl.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen"
      aria-hidden
    />
  );
}
````

---

## `src/components/WormholeStage.tsx`

Client shell. Calls `useScrollDepth(true)` and renders `<JuliaWormholeBackdrop />` + `<HeroOverlay />`.

````tsx
'use client';

import type { ReactElement } from 'react';

import { JuliaWormholeBackdrop } from '@/components/JuliaWormholeBackdrop';
import { HeroOverlay } from '@/components/HeroOverlay';
import { useScrollDepth } from '@/hooks/useScrollDepth';

/**
 * Top-level client shell for the wormhole experience.
 *
 * Mounts:
 *   - the Three.js backdrop (z-0, pointer-events: none)
 *   - the scroll → tunnelStore integrator (no DOM)
 *   - the HTML hero overlay (z-10)
 */
export function WormholeStage(): ReactElement {
  useScrollDepth(true);

  return (
    <>
      <JuliaWormholeBackdrop />
      <HeroOverlay />
    </>
  );
}
````

---

## `src/components/HeroOverlay.tsx`

HTML overlay — title, subtitle, scroll-to-enter hint that fades on first scroll, mode-toggle pill bottom-left. `data-no-wheel` on the pill so clicking it doesn't feed wheel deltas to the store.

````tsx
'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { tunnelStore } from '@/tunnel/tunnelStore';

/**
 * HTML hero overlay rendered in front of the wormhole.
 *
 * - Title + subtitle, anchored centre-top.
 * - "Mode" pill (locked / free) bottom-left, tappable.
 * - A scroll-to-enter hint that fades out after the first scroll.
 */
export function HeroOverlay(): ReactElement {
  const [mode, setMode] = useState<'locked' | 'free'>('locked');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const apply = () => {
      const s = tunnelStore.getState();
      setMode(s.mode);
      if (Math.abs(s.depth) > 0.5 || Math.abs(s.velocity) > 0.5) setScrolled(true);
    };
    apply();
    const unsub = tunnelStore.subscribe(apply);
    return unsub;
  }, []);

  const toggleMode = () => {
    tunnelStore.setState({ mode: mode === 'locked' ? 'free' : 'locked' });
  };

  return (
    <>
      {/* Title block */}
      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="select-none text-5xl font-extralight tracking-[0.2em] text-white/90 drop-shadow-[0_0_24px_rgba(120,80,255,0.45)] sm:text-6xl md:text-7xl">
          JULIA WORMHOLE
        </h1>
        <p className="mt-4 max-w-md select-none text-sm font-light tracking-widest text-white/55 sm:text-base">
          A scroll-driven journey through a 360° fractal interior.
        </p>
      </div>

      {/* Scroll hint */}
      <div
        className={`pointer-events-none fixed bottom-12 left-1/2 z-10 -translate-x-1/2 select-none text-xs uppercase tracking-[0.4em] text-white/40 transition-opacity duration-1000 ${
          scrolled ? 'opacity-0' : 'opacity-100'
        }`}
      >
        Scroll to enter
      </div>

      {/* Mode toggle pill */}
      <button
        type="button"
        onClick={toggleMode}
        data-no-wheel
        className="fixed bottom-4 left-4 z-30 select-none rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/70 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
        aria-label="Toggle scroll mode"
      >
        {mode === 'locked' ? '◉ Locked' : '◎ Free Fly'}
      </button>
    </>
  );
}
````

---

