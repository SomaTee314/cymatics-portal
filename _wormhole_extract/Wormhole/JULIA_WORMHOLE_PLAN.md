# Julia Wormhole — architecture & design plan

This document explains **what** the project builds, **why** each architectural decision was made, and **the specific GLSL trick** that makes the 360° interior fractal seamless. It's a companion to `JULIA_WORMHOLE_IMPL.md` (which contains every source file verbatim) and `CURSOR_PROMPTS.md` (the phased rebuild prompts).

---

## 1. The user experience

The viewer lands on a black page, sees the title **"JULIA WORMHOLE"** and a soft "Scroll to enter" hint. From the moment they begin scrolling — wheel, trackpad, touch, or the keyboard — the camera flies forward into a tubular 3D space whose entire 360° interior is painted with a Julia fractal that *evolves* as they travel. The fractal is not a frozen texture: its parameter `c` orbits a small disc in complex space (the canonical Cymatics holo orbit centred on `c = -0.7269 + 0.1889i`), and every depth band the camera flies through samples a slightly different region of the complex plane. The visceral feel is **motion through a self-similar but non-repeating fractal interior**, not "scrolling a pretty backdrop."

Around the tube wall, sparse bright **accent rings** mark depth like rungs on a ladder; their parallax sells distance. Three **helical neon strands** spiral through the cylinder's hollow space. **Drifting particles** read as speed-line cues. Beyond the tube's far end, a softly-evolving **Julia skybox** with **holo-tinted stars** dissolves into exponential fog. Everything bright is haloed by **UnrealBloom**.

When the user stops scrolling, the camera doesn't snap to a halt — momentum coasts for ~60 seconds with exponential decay, and an idle drift forward keeps the sense of motion alive even at rest. Pressing `L` toggles between **locked** mode (gentle drift, deliberately slow) and **free fly** mode (wheel impulses with friction decay, faster acceleration).

---

## 2. The architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ app/layout.tsx              (server)                                 │
│  └─ app/page.tsx            (server) → renders <WormholeStage />     │
│     │                                                                │
│     └─ components/WormholeStage.tsx     ("use client")               │
│        ├─ useScrollDepth(true)              (no DOM, drives store)   │
│        ├─ <JuliaWormholeBackdrop />         fixed inset-0 z-0        │
│        │   • Three.js scene                                          │
│        │   • own RAF, reads tunnelStore.getState() each frame        │
│        │   • renderer + EffectComposer with UnrealBloom + Output     │
│        └─ <HeroOverlay />                   z-10 (text) z-30 (pill)  │
└──────────────────────────────────────────────────────────────────────┘
                            ▲
                            │  tunnelStore (vanilla pub/sub)
                            │  { mode, depth, velocity, juliaCx/Cy,
                            │    discRadius, tubeRadius, tubeLength,
                            │    ringCount, helixCount, particleCount,
                            │    fogDensity, bloom*, tubeRepeat,
                            │    twist, ringRadius, intensity, ... }
```

**One client component, one Three.js render context, one store.** No R3F, no Zustand, no Lenis. Keeping the dependency graph small is deliberate: a wormhole scene is small enough that R3F's scene-graph reactivity is unnecessary overhead, and our own store + RAF gives us per-frame uniform updates with zero React re-renders.

### Why no R3F

R3F is excellent when you want declarative scene composition (lots of meshes that come and go reactively, suspense-loaded GLTFs, declarative cameras, post-effects via `@react-three/postprocessing`). For this scene — one cylinder, twelve rings, three helices, one particle system, one skybox — the overhead of R3F's reconciler, useFrame priority dispatcher, and declarative event system isn't paying for itself. Direct Three with a single `useEffect` setup gives smaller bundle, less indirection, and fewer "where does this hook into" questions when debugging shaders.

### Why no Zustand / Redux / Lenis

`tunnelStore` is a 90-line file with `getState`, `setState`, `subscribe`. That's all this project needs. Zustand would add a runtime dep (8kB) and zero capability. Lenis is a great library but a custom 60-line wheel/touch integrator is simpler here and gives us *exactly* the inertia decay curve we want (a 60-second e-folding coast that lingers without feeling sticky).

---

## 3. The shader — what makes the 360° wrap seamless

This is the single most important piece of the project. Get this wrong and you see a visible seam where the cylinder UV wraps from `vUv.x = 1` back to `vUv.x = 0`.

### The naive approach (broken)

```glsl
// Don't do this — it produces a seam
vec2 z0 = (vUv - 0.5) * 2.0;  // -1..1 in both axes
// ... iterate Julia ...
```

The Julia function isn't periodic. If you treat the cylinder UVs like a flat 2D plane, the pixel column at `vUv.x = 0` and the pixel column at `vUv.x = 1` are sitting at different points of the complex plane (-1 and +1 on the real axis). When the cylinder wraps around, those two columns are **physically the same line of vertices** — but they show different fractal patterns. Visible seam, ugly.

### The right approach: sample on a circle

```glsl
float angle = vUv.x * 6.28318530718;  // 0..2π
float along = vUv.y * uTubeRepeat - uDepth * 0.04;

// Twist couples angle and depth — fractal "spirals" past you
float twistedAngle = angle + along * uTwist;

// Sample on a circle of breathing radius in complex space
float r = uRingRadius * (1.0 + 0.18 * sin(along * 0.6));
vec2 z0 = vec2(cos(twistedAngle), sin(twistedAngle)) * r;
```

The angular coordinate `vUv.x` parametrises a **circle** in the complex plane, not a line. At `vUv.x = 0` and `vUv.x = 1`, `cos(angle)` and `sin(angle)` produce the *same* values — the sampled complex point is literally identical, so the fractal at the seam is identical too. **No seam, ever.**

### Why the 360° flow doesn't feel static

Three independent variations make it move:

1. **Time animation of `c`.** The Julia parameter orbits a disc:
   ```glsl
   vec2 c = uCenter + uDiscRadius * vec2(cos(uTime * 0.11), sin(uTime * 0.13));
   ```
   The shape of the fractal continuously transforms; locally you see filaments breathing and forming.

2. **Depth animation of `c`.** The same `ph1` and `ph2` phases include `along * 0.18` and `along * 0.16`. So *each depth band* of the tube has a slightly different Julia. Flying forward = traversing different Julias. This is the "journey" feel.

3. **Helical twist.** `twistedAngle = angle + along * uTwist`. As you fly forward, the cosine-circle in complex space rotates slowly, so the same fractal column appears to spiral around you.

The combination of these three is what makes the experience read as **moving through fractal space** rather than **scrolling a fractal pattern**.

### Smooth iteration count + IQ palette

Two more details that separate "polished" from "amateur":

```glsl
float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;
```

This is Inigo Quilez's continuous escape count (https://iquilezles.org/articles/msetsmooth/). Without it, the cosine palette would band into visible iteration steps.

```glsl
vec3 palette(float t) {
  return vec3(0.5) + vec3(0.55) * cos(6.28318530718 * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67)));
}
```

IQ's cosine palette (https://iquilezles.org/articles/palettes/), tuned to the Cymatics holo spectrum (pink → purple → blue → mint cycle).

```glsl
col = 1.0 - exp(-col * uIntensity);
```

Tonemap shoulder — squashes hot pixels into smooth highlights instead of clipping to white.

---

## 4. Geometry choices

### Why CylinderGeometry, not TubeGeometry along a curve

A `TubeGeometry` along a `CatmullRomCurve3` lets you bend the wormhole through 3D space. That sounds compelling but in practice creates two problems: (a) the camera has to follow the curve with `getPointAt` / `getTangentAt`, and any timing mismatch between camera and fractal-depth uniform causes visible shudder; (b) the user reads a curving tube as "I'm on a track" rather than "I'm flying through a place," which weakens the journey feel.

A straight `CylinderGeometry` aligned with -Z gives:

- Clean UVs (vUv.x angular, vUv.y axial — exactly what the shader expects).
- Trivially correct camera path (move in -Z).
- Endless loop is just `cz = -((depth % length) + length) % length`.
- Subtle camera roll based on velocity gives all the motion personality the curve would have, without any track-following overhead.

### Why an explicit cylinder + accent rings, not just lots of rings

The reference implementation in the existing Nocturnal Labs project uses 72 concentric rings to suggest a tunnel. That works but the spaces *between* the rings are empty — your eye fills them in, but there's no actual fractal there.

This project paints the **continuous interior** with the fractal so every pixel between rings is a real Julia evaluation. The rings stay (sparse, 12 instead of 72) as bright accent bands giving depth landmarks, but the tube wall is the primary visual.

### Geometry parameters at a glance

| Parameter | Default | Why |
|---|---|---|
| `tubeRadius` | 6 | Wide enough to feel spacious, narrow enough that wall fractal is dense in view |
| `tubeLength` | 240 | Long enough that one wraparound is non-obvious; short enough to fit in 16-bit float ranges with comfort |
| `tubeRadialSegments` | 128 | Smooth circle in projection; 96 on mobile |
| `tubeLengthSegments` | 320 | Avoids long-tube faceting from view-side |
| `ringCount` | 12 | Sparse enough to be landmarks; 6 on mobile |
| `helixCount` | 3 | Visual rhythm; matches palette tertiary |
| `particleCount` | 1800 | Speed lines without cost; 700 on mobile |

---

## 5. Scroll → camera plumbing

`useScrollDepth` runs in its own RAF and writes `depth` + `velocity` to `tunnelStore` each frame. Three things make it feel right:

**Coast decay.** Velocity multiplies by `Math.exp(-dt / 60)` each frame, so a wheel impulse coasts for ~60 seconds with smooth exponential decay. Combined with `Math.pow(friction, dt * 8)` in free mode, scrolling has weight.

**Idle drift.** When velocity falls below a small threshold in locked mode, it's clamped to `idleForward = 0.6`. This is the single most "alive" detail — the camera never fully stops, even when the user isn't doing anything.

**Wrap, don't clamp.** When `depth` exceeds `maxDepth`, it wraps to 0 (and vice versa). Combined with `cz = -(depth % tubeLength)` in the scene, flying is genuinely endless.

**Cross-input normalisation.** Wheel events come in pixel-mode, line-mode, or page-mode depending on browser/OS; we normalise via `e.deltaMode * {1, 40, 800}`. Touch deltas multiply by 2.5 to match wheel feel. Keyboard deltas are coarse (`KEY_DELTA = 5`) so PageUp/PageDown have weight.

---

## 6. Postprocessing — bloom is doing real work

```ts
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(size, 0.95, 0.85, 0.18));  // strength, radius, threshold
composer.addPass(new OutputPass());
```

`UnrealBloomPass` is the single most expensive thing in the scene. With renderer set to `NoToneMapping` and `OutputPass` last, tone mapping happens once at the end (correct). If we set `renderer.toneMapping = ACESFilmicToneMapping` AND used OutputPass, tone mapping would be applied twice — once to the HDR composer target, once in OutputPass — washing out colours. Don't do that.

Mobile clamps bloom strength to ≤ 0.6 and DPR to 1.25 to keep frame budget tight.

---

## 7. Disposal — paranoid for SPA navigation

Three.js doesn't garbage-collect GPU resources. If you don't dispose, every page navigation leaks geometry, materials, textures, and render targets. Mobile Safari crashes after ~3 unmounts.

The cleanup function at the end of `JuliaWormholeBackdrop`'s effect disposes:

- `composer` (which disposes its passes)
- The cylinder's geometry + material
- Every ring's geometry + material
- Every helix's geometry + material
- Particles geometry + material
- Stars geometry + material
- Sky geometry + material
- The renderer (which releases the WebGL context)
- Removes the canvas from the DOM

It also removes resize, visibilitychange, and contextlost listeners.

---

## 8. Mobile + reduced-motion strategy

**Mobile detection** uses `matchMedia('(pointer: coarse)') && matchMedia('(hover: none)')` — not user-agent. This catches phones and tablets while leaving touch laptops on the desktop path.

**Mobile clamps** (applied at scene-build time, since changing radial/length segments would require geometry rebuild):

- `ringCount` → ≤ 6
- `particleCount` → ≤ 700
- `tubeRadialSegments` → ≤ 96
- `tubeLengthSegments` → ≤ 200
- `bloomStrength` → ≤ 0.6
- DPR → ≤ 1.25
- Antialias → off (bloom blurs the aliasing anyway)

**Reduced motion** (read once at scene build, applied every frame):

- Camera roll skipped
- Tube `uTime` clamped to 0 (no breathing fractal)
- Sky `uTime` clamped to 0
- Ring spin skipped
- Helix rotation skipped
- Particle angular swirl skipped (Z drift from scroll still works — that's user-initiated)
- Star rotation skipped
- Bloom strength reduced 30%
- Scroll-driven depth still flows (user-initiated, allowed)

---

## 9. What can go wrong

**Two-pixel seam at the cylinder bottom edge.** If `tubeLengthSegments` is too low, the cylinder's interior facetting becomes visible at grazing angles. 320 is the floor for desktop; 200 is the floor for mobile.

**Bloom + transparency interaction.** UnrealBloom samples the scene's framebuffer; transparent passes that don't write depth (additive rings, helices, particles) bloom *additively* on top of opaque content. This is the desired behaviour but watch for accent rings appearing too bright when they overlap thick fractal regions — that's bloom doubling the energy.

**WebGL context loss on mobile.** Some Android Chromes drop the GL context aggressively when memory pressures hit. The `webglcontextlost` listener bails the RAF cleanly; React StrictMode + the cleanup function handle the remount.

**Concurrent WebGL contexts.** This project has exactly one. If you ever add an R3F coin or another canvas, mobile Safari caps you at 8 — plenty of headroom but worth knowing.

**The `vUv.y` direction.** CylinderGeometry's UV.y goes from 0 (top) to 1 (bottom) in local Y. After we rotate the cylinder 90° around X, "bottom" becomes "+Z" and "top" becomes "-Z". So `vUv.y = 0` is the *near* end (camera side) and `vUv.y = 1` is the *far* end. The vignette logic in the shader (`smoothstep(0.0, 0.12, vy) * smoothstep(1.0, 0.88, vy)`) darkens both ends, which is correct: you don't want bright walls at the camera's nose, and you want fog to swallow the far end.

---

## 10. References

- Inigo Quilez, "Smooth iteration count" — https://iquilezles.org/articles/msetsmooth/
- Inigo Quilez, "Palettes" — https://iquilezles.org/articles/palettes/
- Inigo Quilez, "Tunnel" — https://iquilezles.org/articles/tunnel/
- Three.js EffectComposer + UnrealBloom — https://threejs.org/examples/?q=bloom
- Three.js FogExp2 — https://threejs.org/docs/#api/en/scenes/FogExp2
- Lusion + Codrops "Curly tubes" tutorial — https://tympanus.net/codrops/2021/05/17/curly-tubes-from-the-lusion-website-with-three-js/
- Three.js Journey scroll-based animation — https://threejs-journey.com/lessons/scroll-based-animation

---

## 11. Summary of the design philosophy

Every decision in this project optimises for **one continuous, seamless, evolving fractal interior** as the *primary* visual, with everything else (rings, helices, particles, bloom) subordinated to that core experience. The shader trick (sample on a circle of complex space, twist with depth, animate `c` with time *and* along) is what makes the 360° wrap genuinely seamless. The geometry trick (straight cylinder, BackSide, modular Z camera) is what makes the journey endless without curve-following overhead. And the disposal trick (release everything, paranoid) is what makes it survive in production.
