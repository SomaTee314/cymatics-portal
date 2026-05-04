# Julia Wormhole

A scroll-driven journey through the **360° interior of a Julia fractal**, rendered in real-time on the GPU.

The viewer is placed inside a cylindrical tube whose entire inner surface is painted with a continuously evolving Julia fractal. As they scroll, the camera flies forward along the tube's axis; the fractal morphs in two ways — the Julia parameter `c` orbits in time *and* depth, so each "depth band" of the tube is a slightly different Julia, and the sample radius/orientation breathe so the experience reads as genuine motion through fractal space rather than a static texture flying past.

Around the tube: sparse accent rings (depth landmarks), three helical neon strands, drifting holo-tinted particles, a Julia-fractal skybox, and an UnrealBloom post-process pass that gives every neon edge a soft halo.

---

## Stack

- **Next.js 14** (App Router, React Server Components)
- **React 18.3**
- **Three.js 0.170** (raw, with `examples/jsm` postprocessing — no R3F here; the scene is small enough that direct Three is leaner)
- **TypeScript 5.8** (strict)
- **Tailwind CSS 3.4** (just for the hero overlay; the GL canvas does its own work)

No external state library — the project ships a tiny vanilla pub/sub `tunnelStore` because Zustand would be overkill for one store.

---

## Quick start

```bash
pnpm install        # or npm install / yarn
pnpm dev            # http://localhost:3000
```

Other commands:

```bash
pnpm type-check     # tsc --noEmit
pnpm lint           # next lint
pnpm build          # production build
pnpm start          # serve production build
```

---

## Controls

| Input | Effect |
|---|---|
| Wheel / trackpad / touch | Drives camera depth (forward by default) |
| `↓` / PageDown | Increase forward velocity |
| `↑` / PageUp | Decrease / reverse velocity |
| `Home` | Reset to depth 0 |
| `End` | Jump to max depth |
| `L` | Toggle scroll mode (locked ↔ free fly) |
| Bottom-left pill | Toggle scroll mode |

---

## Documentation

- [`JULIA_WORMHOLE_PLAN.md`](./JULIA_WORMHOLE_PLAN.md) — architecture, design decisions, the GLSL trick that makes the 360° wrap seamless.
- [`JULIA_WORMHOLE_IMPL.md`](./JULIA_WORMHOLE_IMPL.md) — every source file, full text, ready to paste into Cursor.
- [`CURSOR_PROMPTS.md`](./CURSOR_PROMPTS.md) — five phased Cursor prompts (Build + Test for each phase) to recreate the project from scratch.

---

## What "authentic" means here

The fractal isn't a baked texture, a baked video, or a generic warp shader. Every pixel of the tube interior is a real escape-time Julia evaluation each frame — 96-iteration max, smooth iteration count, IQ cosine palette, tonemap shoulder. The cylinder UVs are mapped to the complex plane along a circle so the angular wrap-around at θ=0=2π lands on the *same* complex point — meaning there is no seam, ever. Depth bands sample circles of breathing radius and twisted orientation, so flying forward genuinely traverses fractal space rather than scrolling a 2D pattern.

That's the difference between Lusion-tier and "AI-generated."
