# Cursor prompts — Julia Wormhole, phased build

Five phases. Each phase has **one BUILD prompt** (paste into Cursor as-is) and **one TEST prompt** (paste after the build completes, to verify before moving on). Run them in order — later phases assume earlier phases are green.

> **How to use these.** Open Cursor in an empty folder. For each phase: copy the BUILD prompt, paste into Cursor's chat, let it create/edit files, accept the diffs. Then copy the TEST prompt, paste, follow Cursor's verification steps. Only proceed to the next phase once tests pass.

> **Source of truth.** When in doubt, the verbatim files in `JULIA_WORMHOLE_IMPL.md` are canonical — if Cursor produces a slightly different version, you can always paste the verbatim file in.

---

## Phase 1 — Project scaffold

**Goal:** A blank Next.js 14 + TypeScript + Tailwind 3 + Three.js project that boots to a black page with no errors.

### Phase 1 — BUILD

```
TASK — Scaffold a fresh Next.js 14 (App Router) project named "julia-wormhole"
in the current empty directory. Use TypeScript strict mode, Tailwind CSS 3,
ESLint with next/core-web-vitals, and pin these dependency versions exactly.

CREATE these files at repo root:

1. `package.json`:
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

2. `tsconfig.json` — strict, ES2017 target, "@/*" → "./src/*", include
   "next-env.d.ts" + ts/tsx + ".next/types/**/*.ts", with `{ "name": "next" }`
   in plugins.

3. `next.config.mjs`:
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     transpilePackages: ['three'],
     reactStrictMode: true,
   };
   export default nextConfig;

4. `tailwind.config.mjs` — content scans ./src/**/*.{js,ts,jsx,tsx,mdx}, no
   theme extensions, no plugins.

5. `postcss.config.mjs` — standard tailwindcss + autoprefixer chain.

6. `.eslintrc.json` — { "extends": "next/core-web-vitals" }

7. `.gitignore` — standard Next.js: /node_modules, /.next, /out, /build,
   .env*.local, .env, *.tsbuildinfo, next-env.d.ts, .DS_Store, coverage, *.pem,
   .vscode.

8. `next-env.d.ts` — the standard Next ambient-types stub:
   /// <reference types="next" />
   /// <reference types="next/image-types/global" />
   // NOTE: This file should not be edited.
   // see https://nextjs.org/docs/basic-features/typescript for more information.

CREATE under `src/app/`:

9. `src/app/layout.tsx` — root layout with metadata { title: 'Julia Wormhole',
   description: 'A scroll-driven journey through the 360° interior of a Julia
   fractal wormhole.' }, viewport { themeColor: '#020204', width:
   'device-width', initialScale: 1 }, lang="en", imports './globals.css'.

10. `src/app/page.tsx` — minimal placeholder: `export default function Home()
    { return <main className="min-h-screen" />; }`

11. `src/app/globals.css` — three @tailwind directives, then html+body height
    100%, body bg-[#020204] text-zinc-100 antialiased, hide scrollbars.

After writing files, run:
  npm install
  npm run type-check
  npm run lint
  npm run build

Report any errors. Do not proceed if any of the three commands fails.
```

### Phase 1 — TEST

```
VERIFY Phase 1.

Run each of these and confirm all pass:

  npm run type-check    # tsc --noEmit, must be clean
  npm run lint          # next lint, no warnings/errors
  npm run build         # next build, must succeed
  npm run dev           # then visit http://localhost:3000

Expected at http://localhost:3000:
  - Pure black background (color #020204)
  - No content visible
  - Browser DevTools console: zero errors, zero warnings (apart from React
    DevTools install hint — that's fine)
  - Network tab: HTML + CSS + minimal JS chunks, all 200s

If anything fails, STOP and tell me what failed before continuing to Phase 2.
```

---

## Phase 2 — State + scroll plumbing (no visuals yet)

**Goal:** A vanilla pub/sub `tunnelStore` and a `useScrollDepth` hook that translates wheel/touch/keyboard into store updates. Verifiable via a tiny diagnostic overlay before any 3D goes in.

### Phase 2 — BUILD

```
TASK — Add the scroll-driven state pipeline. NO Three.js yet — just the store,
the hook, and a diagnostic overlay that lets us verify the pipeline works
before building any 3D.

CREATE `src/tunnel/tunnelStore.ts`:

  - "use client" directive at the top.
  - Type ScrollMode = 'locked' | 'free'.
  - Type TunnelState with fields:
      mode, depth, velocity, sensitivity, friction, maxDepth, idleForward,
      juliaCx, juliaCy, discRadius,
      tubeRadius, tubeLength, tubeRadialSegments, tubeLengthSegments,
      ringCount, ringSpacing, helixCount, particleCount,
      fogDensity, bloomStrength, bloomRadius, bloomThreshold,
      tubeRepeat, twist, ringRadius, intensity.
  - INITIAL constant with these defaults:
      mode 'locked', depth 0, velocity 0, sensitivity 0.0015, friction 0.92,
      maxDepth 1024, idleForward 0.6,
      juliaCx -0.7269, juliaCy 0.1889, discRadius 0.172,
      tubeRadius 6, tubeLength 240, tubeRadialSegments 128, tubeLengthSegments 320,
      ringCount 12, ringSpacing 18, helixCount 3, particleCount 1800,
      fogDensity 0.018, bloomStrength 0.95, bloomRadius 0.85, bloomThreshold 0.18,
      tubeRepeat 4.5, twist 0.55, ringRadius 1.5, intensity 1.0.
  - `tunnelStore` exports: getState, setState (Partial), reset, subscribe (returns
    unsubscribe). Implementation: module-scoped `state` variable, `Set<() => void>`
    for listeners. Spread-merge in setState, emit() after.
  - Also export `TUNNEL_INITIAL` so consumers can read defaults.

CREATE `src/hooks/useScrollDepth.ts`:

  - "use client".
  - Export `useScrollDepth(enabled: boolean)` — useEffect-based hook.
  - Constants: TOUCH_MULTIPLIER = 2.5, KEY_DELTA = 5,
    SCROLL_COAST_TAU_SEC = 60, LOCKED_VEL_MAX = 140, FREE_VEL_MAX = 45.
  - normalizeWheel(e): handles deltaMode 0/1/2 (px/line/page), clamps ±100,
    returns 0 if e.ctrlKey (pinch-zoom).
  - useRefs: wheelAccum, lastTouchY, raf, lastT (perf.now), currentDepth,
    currentVelocity.
  - On mount when enabled:
      - Sync refs from store; subscribe to store updates re-syncing refs.
      - Toggle html.scroll-locked class based on store.mode.
      - Wheel listener (passive: false) — preventDefault, accumulate
        normalizeWheel; respect [data-no-wheel] ancestors.
      - Touch start/move listeners — touchmove preventDefault, accumulate
        delta * TOUCH_MULTIPLIER.
      - Keydown listener: 'l'/'L' toggles mode; ArrowDown/PageDown adds velocity
        (locked) or accumulator (free); ArrowUp/PageUp subtracts; Home → depth 0,
        velocity 0; End → depth = maxDepth, velocity 0. Skip if active element
        is INPUT or TEXTAREA.
      - RAF tick(t):
          - dt = clamp((t - lastT)/1000, 1/240, 0.05).
          - coast = exp(-dt / SCROLL_COAST_TAU_SEC).
          - free mode: impulse = wheelAccum * sensitivity; v += impulse,
            clamped to ±FREE_VEL_MAX; d += v*dt, WRAP at [0, maxDepth];
            v *= coast * pow(friction, dt*8).
          - locked mode: impulse = wheelAccum * sensitivity * 0.35; same
            clamping; if idleForward > 0 and |v| < 0.08, v = idleForward;
            d wraps at [0, maxDepth]; v *= coast.
          - Write d, v back to store and refs. Reset wheelAccum to 0 each tick.
      - visibilitychange: cancel RAF when hidden, restart on visible (reset lastT).
  - Cleanup: remove all listeners, cancel RAF, remove scroll-locked class.

CREATE `src/components/ScrollDiagnostic.tsx`:

  - "use client".
  - Subscribes to tunnelStore via useEffect + useState.
  - Renders a fixed top-right panel: monospace, white/30 backdrop blur, shows
    mode, depth (3 dp), velocity (3 dp). Updates each store emit.
  - data-no-wheel on the wrapper.

UPDATE `src/app/page.tsx` to render a small wrapper:

  import { ScrollDiagnostic } from '@/components/ScrollDiagnostic';
  import { useScrollDepth } ...
  This page is a server component — wrap in a client component that calls
  useScrollDepth(true) and renders <ScrollDiagnostic />.

  Approach: create `src/components/Phase2Stage.tsx` ("use client") that calls
  useScrollDepth(true) and renders <ScrollDiagnostic />. page.tsx renders
  <Phase2Stage />.

After writing files:
  npm run type-check
  npm run lint
  npm run build

Report any errors.
```

### Phase 2 — TEST

```
VERIFY Phase 2.

  npm run dev
  Open http://localhost:3000

Expected:
  - Top-right monospace panel shows: mode=locked, depth=0.000, velocity=0.000
  - Scroll the wheel: velocity becomes non-zero, depth increments smoothly.
  - Stop scrolling: velocity does NOT immediately drop to 0 — it coasts (decays
    over ~60 seconds). Depth keeps creeping up because of idleForward = 0.6.
  - Press 'L': mode toggles to 'free'.
  - In free mode, scroll: velocity is much more responsive, depth changes
    faster, and decay is sharper (you stop scrolling and within a second or two
    velocity is near zero, but depth holds).
  - Press 'L' again to return to locked.
  - Press Home: depth resets to 0.
  - Press End: depth jumps to 1024 (maxDepth).
  - Scroll past maxDepth boundary: depth WRAPS to near 0, doesn't clamp.
  - Hover over the diagnostic panel and scroll — page scroll on the panel itself
    should not feed depth (because data-no-wheel is set).
  - Tab away, wait 5s, tab back: no stutter, no frame snap. Coast resumes from
    where it was.
  - Open DevTools Console: no errors.

If any of these fails, STOP and report which one. Do not move to Phase 3.
```

---

## Phase 3 — The wormhole (inner tube + Julia shader)

**Goal:** The visual heart. A `BackSide` cylinder with the Julia fractal painted on its 360° interior, camera flying down -Z, reading from the store. No accent rings, no helices, no particles, no bloom — just the seamless fractal interior.

### Phase 3 — BUILD

```
TASK — Add the core Three.js scene: a cylinder rendered with BackSide whose
inner surface is painted with a depth-evolving Julia fractal. NO accent rings,
NO helices, NO particles, NO bloom yet — those come in Phase 4. The goal of
Phase 3 is to verify the SHADER and the camera flight feel right in isolation.

REMOVE the diagnostic overlay from page.tsx (we don't need it once the scene
is visible). Keep `Phase2Stage.tsx` and `ScrollDiagnostic.tsx` on disk for
optional debug use; just don't render them.

CREATE `src/visuals/shaders/juliaWormholeShaders.ts`:

  - Export `wormholeVertex` (template literal) — passes vUv, applies projection.
  - Export `wormholeFragment` (template literal) — precision highp float, varying
    vec2 vUv, uniforms:
        uTime, uDepth, uVelocity (floats),
        uCenter (vec2), uDiscRadius (float),
        uTubeRepeat, uTwist, uRingRadius, uIntensity, uMode (floats).

  - palette() — IQ cosine: a=vec3(0.5), b=vec3(0.55), c=vec3(1.0),
    d=vec3(0.00, 0.33, 0.67); return a + b*cos(2π*(c*t + d)).

  - main():
      1. If uMode > 0.5 (skybox): z0 = (vUv-0.5)*2 / 0.55, along = uDepth*0.05.
      2. Else (tube):
           angle = vUv.x * 2π
           along = vUv.y * uTubeRepeat - uDepth * 0.04
           twistedAngle = angle + along * uTwist
           r = uRingRadius * (1.0 + 0.18 * sin(along * 0.6))
           z0 = vec2(cos(twistedAngle), sin(twistedAngle)) * r
           z0 += vec2(0.06*sin(along*0.31), 0.06*cos(along*0.27))
      3. ph1 = uTime*0.11 + along*0.18; ph2 = uTime*0.13 + along*0.16
         c = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2))
      4. Iterate Julia: MAX_ITERS = 96, B = 64.0; standard escape-time loop.
      5. Smooth iter count: sn = n - log2(log2(max(m2, 1.0001))) + 4.0.
      6. Color: t = 0.04*sn + 0.06*along + 0.02*uDepth; col = palette(t).
      7. escaped = step(B*B, m2); col *= mix(0.18, 1.6, escaped).
      8. Tonemap: col = 1.0 - exp(-col * uIntensity).
      9. If uMode < 0.5 (tube only): vy = vUv.y; vignette =
         smoothstep(0.0, 0.12, vy) * smoothstep(1.0, 0.88, vy); col *= vignette.
      10. col += abs(uVelocity) * 0.0035 * col.
      11. gl_FragColor = vec4(col, 1.0).

CREATE `src/components/JuliaWormholeBackdrop.tsx`:

  - "use client". Returns ReactElement. Container div: pointer-events-none
    fixed inset-0 z-0 h-[100dvh] w-screen, aria-hidden.
  - useEffect, deps []:
      - Read tunnelStore.getState() once into `initial`.
      - WebGLRenderer: antialias true, powerPreference 'high-performance',
        alpha false. setPixelRatio min(devicePixelRatio, 2). setClearColor 0x000.
        toneMapping NoToneMapping (we'll add bloom + OutputPass in Phase 5; for
        now NoToneMapping is fine).
        outputColorSpace SRGBColorSpace. Append canvas to container, position
        absolute inset-0, width/height 100%.
      - Scene + FogExp2(0x05010f, fogDensity).
      - PerspectiveCamera 72° FOV, 0.1 near, 600 far, position (0, 0, 0).
      - Build BackSide ShaderMaterial for the tube — one uniform set, uMode 0.
      - Build CylinderGeometry(tubeRadius, tubeRadius, tubeLength,
        tubeRadialSegments, tubeLengthSegments, openEnded=true).
      - Mesh: rotation.x = π/2, position.z = -tubeLength/2. Add to scene.
      - Resize handler debounced via rAF.
      - RAF tick:
          - dt = clamp(clock.getDelta(), 0, 0.05); time = clock.elapsedTime.
          - s = tunnelStore.getState().
          - cz = -((s.depth % s.tubeLength) + s.tubeLength) % s.tubeLength.
          - camera.position.z = cz.
          - Push uniforms: uTime, uDepth, uVelocity, uCenter (Vector2 set),
            uDiscRadius, uTubeRepeat, uTwist, uRingRadius, uIntensity.
          - Update FogExp2.density = s.fogDensity.
          - renderer.render(scene, camera).
      - Visibility pause: clock.getDelta() on visible.
      - Cleanup: cancel RAF, remove listeners, dispose geometry, material,
        renderer; remove canvas from DOM.

CREATE `src/components/WormholeStage.tsx`:

  - "use client".
  - Calls useScrollDepth(true).
  - Renders <JuliaWormholeBackdrop />.

UPDATE `src/app/page.tsx`:

  import { WormholeStage } from '@/components/WormholeStage';
  export default function Home() { return <WormholeStage />; }

After writing:
  npm run type-check
  npm run lint
  npm run build

Report errors. Do not skip any check.
```

### Phase 3 — TEST

```
VERIFY Phase 3.

  npm run dev
  Open http://localhost:3000

Expected:
  1. Full-viewport view: you are inside a tube. The walls are painted with a
     vibrant Julia fractal in pinks/purples/blues/mints (Cymatics holo palette).
  2. The fractal animates continuously even with no input (because idleForward
     is drifting depth).
  3. SCROLL CHECK: scroll the wheel forward — the fractal pattern flows toward
     you (you read it as moving forward through the tube). Reverse the scroll —
     pattern flows away.
  4. SEAMLESS WRAP CHECK: rotate your head / tilt the page / look around mentally.
     Scrutinise the wraparound where vUv.x = 0 = 1. THERE MUST BE NO VISIBLE
     SEAM. The fractal should be perfectly continuous around the entire 360°
     interior. If you see a vertical line of discontinuity, the shader is
     broken — likely you've used (vUv-0.5)*2 instead of cos/sin(angle)*r.
  5. DEPTH-EVOLVING CHECK: scroll deeply (hold PageDown for 10 seconds). The
     fractal STRUCTURE should change as you go — not just the colour, the actual
     filament shapes and Julia connectivity. If the fractal looks the same at
     every depth, the `along` term in the c animation isn't connected.
  6. VIGNETTE CHECK: the tube ends should be darker than its middle. You should
     not see the cylinder seam edges sharply.
  7. PERFORMANCE: open DevTools Performance tab, record 5 seconds of scrolling.
     Frame rate should be 60 fps on a modern desktop, ≥ 50 fps on a 4-year-old
     laptop. If you see < 40 fps, something is wrong (probably the renderer's
     pixel ratio is too high or the cylinder segments are way over budget).
  8. CONSOLE: no shader compile errors, no WebGL warnings beyond standard
     extension info.
  9. RESIZE: resize the browser window — no flickering, no aspect-ratio
     squashing of the tube.
  10. TAB AWAY + RETURN: no frame snap, no jump.

If 1-5 are not perfect, STOP and report. The shader is the core of the
project — fixing it later is more painful than fixing it now.
```

---

## Phase 4 — Accent layers (rings, helices, particles, skybox, stars)

**Goal:** Layer in the depth landmarks and atmosphere — sparse bright accent rings, three helical strands, drifting particles, the Julia skybox, and holo-tinted stars. No bloom yet (Phase 5).

### Phase 4 — BUILD

```
TASK — Extend `JuliaWormholeBackdrop.tsx` with accent rings, helices, drifting
particles, skybox, and stars. Do NOT add postprocessing/bloom yet — that's
Phase 5. The scene should still render via renderer.render(), not a composer.

EDIT `src/components/JuliaWormholeBackdrop.tsx`:

ADD a PALETTE constant at module top (above the component):
  const PALETTE = [
    new THREE.Color('#ff4da8'),
    new THREE.Color('#8e3bff'),
    new THREE.Color('#3b7bff'),
    new THREE.Color('#4dffb0'),
    new THREE.Color('#f5ff61'),
  ];

INSIDE useEffect, AFTER the tube mesh setup, ADD these subsystems:

1. SKYBOX:
   - skyMat: same shader, uMode = 1, uIntensity = 0.4, BackSide.
   - sky = Mesh(SphereGeometry(420, 48, 32), skyMat). Add to scene.

2. STARS:
   - STAR_COUNT = 1500 (will clamp to 600 on mobile in Phase 5).
   - BufferGeometry with position (vec3) + color (vec3) attributes.
   - For each star: r = 380 + rand*30, theta = rand*2π, phi = acos(2*rand-1).
     position = (r*sin(phi)*cos(theta), r*sin(phi)*sin(theta), r*cos(phi)).
     colour = random PALETTE entry's RGB.
   - PointsMaterial: size 1.2, sizeAttenuation true, vertexColors true,
     transparent, opacity 0.7, AdditiveBlending, depthWrite false, fog false.
   - Add to scene.

3. ACCENT RINGS (initial.ringCount of them, default 12):
   - For each i in [0, ringCount):
     - Material: ShaderMaterial with same wormhole shader, transparent true,
       AdditiveBlending, depthWrite false, DoubleSide, fog false. Uniforms
       same as tube but uTubeRepeat = 1.0, uTwist = 0.0,
       uRingRadius = 1.4 + (i % 5) * 0.12, uMode = 0.
     - Geometry: RingGeometry(tubeRadius * 0.78, tubeRadius * 0.96, 96, 1).
     - Mesh.position.z = -((i + 0.5) / ringCount) * tubeLength.
     - Mesh.rotation.z = (i * 0.41) % (2π).
     - Store userData.spin = 0.18 + (i % 7) * 0.022.
   - Push to `rings: Mesh[]` and `ringMats: ShaderMaterial[]` arrays.
   - Add each to scene.

4. HELICES (initial.helixCount, default 3):
   - Constants: HELIX_PTS = 800, HELIX_TWISTS = 6.
   - For each h in [0, helixCount):
     - phaseOffset = (h / helixCount) * 2π.
     - Build CatmullRomCurve3 with HELIX_PTS+1 points where
       z = -t * tubeLength,
       radius = tubeRadius * 0.78 + sin(t*18) * 0.4,
       angle = phaseOffset + t * 2π * HELIX_TWISTS.
     - tubeGeo = TubeGeometry(curve, HELIX_PTS, 0.06, 8, false).
     - colour = PALETTE[h % PALETTE.length].
     - Material: MeshBasicMaterial { color, transparent, opacity 0.9,
       AdditiveBlending, depthWrite false, toneMapped false, fog true }.
     - Mesh.userData.basePhase = phaseOffset. Push to helices[]. Add to scene.

5. PARTICLES (initial.particleCount, default 1800):
   - BufferGeometry with position (vec3), color (vec3), phase (float)
     attributes.
   - For each i: theta = rand*2π, r = sqrt(rand) * tubeRadius * 0.9,
     z = -rand * tubeLength. position from theta/r/z. colour from PALETTE.
     phase = rand * 2π.
   - PointsMaterial: size 0.16, sizeAttenuation true, vertexColors true,
     transparent, opacity 0.85, AdditiveBlending, depthWrite false,
     toneMapped false, fog true.
   - Add to scene.

INSIDE the RAF tick (after the tube uniform updates and BEFORE
renderer.render):

  // SKY uniforms
  skyMat.uniforms.uTime.value = time * 0.4;
  skyMat.uniforms.uDepth.value = s.depth * 0.05;
  skyMat.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
  skyMat.uniforms.uDiscRadius.value = s.discRadius;

  // RINGS recycle + spin
  for each ring:
    relZ = ring.position.z - cz
    if (relZ > 5) ring.position.z -= s.tubeLength
    else if (relZ < -s.tubeLength + 5) ring.position.z += s.tubeLength
    distFactor = clamp(-relZ / s.tubeLength, 0, 1)
    spinRate = ring.userData.spin * (0.6 + distFactor * 1.8) + s.velocity * 0.04
    ring.rotation.z += spinRate * dt

  // RING uniforms (push to all ringMats)
  for each m in ringMats: same updates as tubeMat (uTime, uDepth, uVelocity,
    uCenter, uDiscRadius).

  // HELICES rotate + flare
  for each helix h:
    h.rotation.z = time * 0.18 + h.userData.basePhase * 0.3 + s.depth * 0.04
    flare = min(|s.velocity| * 0.08, 0.35)
    (h.material).opacity = 0.85 + flare

  // PARTICLES drift + recycle (mutate Float32Array directly)
  positions = pGeo.attributes.position.array as Float32Array
  phases    = pGeo.attributes.phase.array as Float32Array
  dz = s.velocity * dt * 12
  for i in [0, particleCount):
    positions[i*3+2] += dz
    if (positions[i*3+2] > cz + 5)             positions[i*3+2] -= s.tubeLength
    else if (positions[i*3+2] < cz - s.tubeLength + 5) positions[i*3+2] += s.tubeLength
    x = positions[i*3]; y = positions[i*3+1]
    angSpeed = 0.04 + phases[i] * 0.002
    cs = cos(angSpeed * dt); sn = sin(angSpeed * dt)
    positions[i*3]   = x*cs - y*sn
    positions[i*3+1] = x*sn + y*cs
  pGeo.attributes.position.needsUpdate = true

  // STARS + SKY follow camera in Z so they don't drift away
  stars.position.z = cz
  sky.position.z   = cz
  stars.rotation.z = time * 0.005

UPDATE the cleanup function to dispose all new objects:
  - rings: each geometry + material
  - helices: each geometry + material
  - particles: pGeo + material
  - stars: starGeo + material
  - sky: geometry + skyMat

After writing:
  npm run type-check
  npm run lint
  npm run build

Report errors.
```

### Phase 4 — TEST

```
VERIFY Phase 4.

  npm run dev

Expected at http://localhost:3000:

1. The fractal tube interior is still there (Phase 3 still works).
2. RINGS: 12 bright fractal-textured rings hang along the tube. They appear
   at intervals; nearer ones are larger, farther ones smaller (perspective
   foreshortening). They spin around the camera axis.
3. HELICES: 3 thin neon strands (pink, purple, blue) twist through the tube's
   hollow space. They rotate slowly around the tube axis.
4. PARTICLES: pinpoints of light drift past the camera, creating speed-line
   cues. When you scroll fast, they appear to streak (because they update
   per-frame Z by velocity).
5. SKYBOX: at the FAR end of the tube (look down -Z deep), you should see a
   slowly-evolving Julia fractal sky, not pure black.
6. STARS: 1500 bright pinpoints scattered on a sphere just inside the sky,
   slowly rotating.
7. RECYCLE: scroll forward continuously for 30 seconds. Rings/particles never
   "run out" — they recycle behind you to in front.
8. PARALLAX: as you scroll, near rings move faster across your view than
   far rings. THIS IS THE DEPTH SIGNAL — confirm it reads as "I am
   accelerating through space" and not "things are wobbling."
9. PERFORMANCE: 60 fps desktop, 30+ fps on a 3-year-old phone. If desktop
   drops below 50 fps, particle count or radial segments are too high.
10. CONSOLE: no errors. (Some "drawing buffer" warnings are normal.)

If rings are static (don't recycle) → the rings recycle block is broken.
If sky is invisible → check skyMat uMode = 1 and sphere radius (420).
If stars not visible → check additive blending + opacity on PointsMaterial.

When all 10 are confirmed, proceed to Phase 5.
```

---

## Phase 5 — Postprocessing, polish, hero overlay, production

**Goal:** Bloom halo on everything neon, mobile clamps, reduced-motion respect, the HTML hero overlay, and a clean production build.

### Phase 5 — BUILD

```
TASK — Final phase. Add EffectComposer with UnrealBloomPass, mobile + reduced-
motion clamps, the hero HTML overlay, and verify production build.

EDIT `src/components/JuliaWormholeBackdrop.tsx`:

1. AT THE TOP of the useEffect, BEFORE building geometry, ADD detection:

   const isMobile =
     typeof matchMedia !== 'undefined' &&
     matchMedia('(pointer: coarse)').matches &&
     matchMedia('(hover: none)').matches;
   const reducedMotion =
     typeof matchMedia !== 'undefined' &&
     matchMedia('(prefers-reduced-motion: reduce)').matches;

   const ringCount         = isMobile ? Math.min(initial.ringCount, 6) : initial.ringCount;
   const particleCount     = isMobile ? Math.min(initial.particleCount, 700) : initial.particleCount;
   const tubeRadialSegments = isMobile ? Math.min(initial.tubeRadialSegments, 96) : initial.tubeRadialSegments;
   const tubeLengthSegments = isMobile ? Math.min(initial.tubeLengthSegments, 200) : initial.tubeLengthSegments;
   const bloomStrength     = isMobile ? Math.min(initial.bloomStrength, 0.6) : initial.bloomStrength;
   const STAR_COUNT        = isMobile ? 600 : 1500;

   Use these clamped variables in the geometry build (NOT initial.X anymore).

2. IN renderer setup:
   - antialias: !isMobile  (was: true)
   - setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2))
   - toneMapping: NoToneMapping  (OutputPass handles it)

3. ADD postprocessing imports at top of file:
   import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
   import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
   import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
   import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

4. AFTER particles setup, ADD composer:
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

5. UPDATE resize handler to ALSO call composer.setSize(w, h).

6. REPLACE renderer.render(scene, camera) with composer.render(dt).

7. INSIDE RAF, AFTER bloom strength updates from store, FACTOR IN reduced-motion:
   bloom.strength = reducedMotion ? s.bloomStrength * 0.7 : s.bloomStrength;

8. WRAP these RAF expressions with `if (!reducedMotion)`:
   - camera.rotation.z = Math.sin(time*0.21)*0.04 + s.velocity*0.0015;
   - tubeMat.uniforms.uTime.value = (else 0)
   - skyMat.uniforms.uTime.value  = (else 0)
   - ring.rotation.z += spinRate * dt
   - h.rotation.z = ...
   - particle x/y rotation block
   - stars.rotation.z = time*0.005

9. ADD context-loss handler:
   const onContextLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); };
   canvasEl.addEventListener('webglcontextlost', onContextLost);
   // Remove on cleanup.

10. UPDATE cleanup to also dispose composer (composer.dispose()) and the
    canvasEl.removeEventListener for contextlost.

CREATE `src/components/HeroOverlay.tsx`:

  - "use client", subscribes to tunnelStore (mode + scrolled-yet flag).
  - Three pieces:
      a) Fixed centred title block (z-10 pointer-events-none): h1 "JULIA WORMHOLE"
         (tracking-[0.2em] white/90 with a purple drop-shadow glow), subtitle
         "A scroll-driven journey through a 360° fractal interior." (white/55).
      b) Bottom-centre hint "Scroll to enter" (fading via opacity-0/100
         transition on `scrolled` flag, set true once |depth|>0.5 or
         |velocity|>0.5).
      c) Bottom-left mode pill — button, data-no-wheel, click toggles mode in
         store. Shows "◉ Locked" or "◎ Free Fly".

UPDATE `src/components/WormholeStage.tsx` to render <HeroOverlay /> below
<JuliaWormholeBackdrop />.

ADD a top-level README.md with the project intro, stack, getting-started
commands, and controls table.

Verify:
  npm run type-check
  npm run lint
  npm run build

Report errors.
```

### Phase 5 — TEST

```
VERIFY Phase 5 (the final phase).

  npm run dev

Expected at http://localhost:3000:

1. **Hero text** centred over the wormhole: "JULIA WORMHOLE" with subtitle.
   Readable but not blocking the visual.
2. **Scroll hint** at bottom-centre: "Scroll to enter" — fades out completely
   the moment you scroll a little.
3. **Mode pill** bottom-left shows "◉ Locked". Click it: changes to
   "◎ Free Fly". Click again: back to Locked. Pressing 'L' has the same effect.
4. **Bloom halo** is now active. All neon edges (rings, helices, particles,
   bright fractal filaments) have a soft glow extending into the surrounding
   space. The total scene should feel ~3x more "alive" than Phase 4.
5. **Production build**: stop dev, run `npm run build`. Output should show:
       Route (app)                              Size     First Load JS
       ┌ ○ /                                    ~140 kB  ~225 kB
   plus a static (○) marker on /. Total bundle should be < 250 kB First Load.
6. **`npm run start`** should serve the production build at :3000 and look
   identical to dev.

7. **Mobile sanity check** — open Chrome DevTools, toggle device toolbar to
   "Pixel 7" (or any phone). Refresh. Expected:
   - Scene renders.
   - Frame rate doesn't tank (the user-agent doesn't flip these clamps but
     pointer/hover media queries DO via DevTools).
   - Bloom is dimmer than desktop.
   - Touch the canvas and drag — drag-scroll feeds depth.
   - Pinch-zoom does NOT hijack scroll (because we ignore wheel events with
     ctrlKey set).

8. **Reduced motion** — system preferences → motion → reduce. Refresh:
   - Tube fractal stops breathing (uTime frozen).
   - Camera roll stops.
   - Rings/helices/particles stop spinning.
   - Scrolling still flies you forward through the (now-static) tube — that's
     user-initiated motion, allowed.
   - Bloom 30% dimmer.

9. **Lighthouse** desktop performance score: aim ≥ 80. (Mobile will be lower
   because shaders cost the same regardless of clamps; that's OK for a fully
   GPU-bound experience.)

10. **GPU memory**: open chrome://gpu in another tab while wormhole is
    running. Total VRAM committed should be roughly stable, not climbing every
    few seconds (which would indicate a dispose leak).

If 1-6 pass, you have a complete working Julia Wormhole. If 7-10 also pass,
you have a production-ready Julia Wormhole.

Final commit suggested: `git add -A && git commit -m "Julia Wormhole: complete"`.
```

---

## Sequence summary

| Phase | What it ships | Verification gate |
|---|---|---|
| 1 | Project scaffold | Black page, three commands clean |
| 2 | Store + scroll hook | Diagnostic overlay shows live numbers under wheel/key/touch |
| 3 | Inner-tube fractal | Seamless 360° wrap, depth-evolving fractal, 60 fps |
| 4 | Rings + helices + particles + skybox + stars | Parallax depth, recycling, atmospheric far end |
| 5 | Bloom + hero + mobile + reduced-motion + production | Lighthouse ≥ 80, build size < 250 kB FLJ |

Each phase is independently testable. If a phase fails, **don't move on** — the failures compound. The shader phase (3) is the highest-leverage check; if the seamless wrap is wrong there, you'll fight cosmetic issues for the rest of the build.
