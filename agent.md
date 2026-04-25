# CYMATICS PORTAL — agent.md

## Agent Instructions for Cursor

You are building a single `index.html` file called **Cymatics Portal**. Read `context.md`, `tech.md`, and `DESIGN.md` fully before writing a single line of code.

---

## Non-Negotiable Rules

1. **DO NOT simplify, remove, or stub out any part of the cymatics engine.** Every function listed in `tech.md` must exist verbatim or functionally equivalent.
2. **DO NOT replace Three.js r76 with a later version.** The BufferGeometry API (`addAttribute`, not `setAttribute`) is r76-specific.
3. **DO NOT use `<form>` tags.** All interactions via event listeners.
4. **DO NOT add React, Vue, or any framework.** This is vanilla JS only.
5. **DO NOT strip the dat.GUI panel.** It must remain accessible via the `H` key.
6. **The audio upload (track mode) must work.** `MediaElementSourceNode` → `AnalyserNode` chain must be intact.

---

## Build Order

### Step 1 — Scaffold the HTML shell

Create `index.html` with:
- `<!DOCTYPE html>` + `<html lang="en">`
- `<meta charset="utf-8">` + viewport meta
- `<title>CYMATICS PORTAL — Particle Madness × Nifty</title>`
- Google Fonts import (Courier New is system; optionally import PP NeueBit or use Courier New as fallback)
- CDN script tags in `<head>` (before closing `</head>`):
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r76/three.min.js"></script>
  ```

### Step 2 — Write the CSS

Write all styles inside a `<style>` block in `<head>`. Use the Nifty design system exactly as specified in `DESIGN.md`:

- `:root` with all CSS variables from `tech.md`
- Noise overlay (`.noise`) — fixed, z-index 9999, pointer-events none, SVG fractalNoise
- `.portal-main` — max-width 1400px, centred, flex column
- `.frame` — dark bg, cream borders via `::before` / `::after` / `.edge-l` / `.edge-r` pseudo/child elements
- `.marquee-bar` — height 4.2vw, clamp 36px–54px
- `.marquee-track` — flex row, gap 2.5vw, `animation: scroll-left 32s linear infinite`
- `.portal-section` — aspect-ratio 16/10, min-height 420px, position relative (canvas injected here)
- `.status-bar` — absolute bottom overlay inside portal section
- `.ctrl-frame` — 3-column grid inside frame
- `.ctrl-col` — padding + border-right (last-child: none)
- Info section — 2-column grid
- Footer bar
- All `select`, `input[type="range"]`, `input[type="number"]`, `input[type="file"]`, `button` styles in Nifty monospace cream-on-dark style
- `button.primary` — solid cream background, dark text
- All responsive overrides at `@media (max-width: 768px)`

### Step 3 — Write the HTML body

Build the DOM structure in this exact order:

```
<div class="noise"></div>
<div class="portal-main">
  1. Marquee bar (top) — .frame.marquee-bar
  2. Spacer
  3. Title area — h1 "CYMATICS PORTAL", subtitle
  4. Spacer
  5. Marquee bar (reverse direction, slower) — .frame.marquee-bar
  6. Spacer
  7. Portal section — .frame.portal-section #portal-container
     └── .status-bar (bottom overlay with #readout)
  8. Spacer
  9. Controls frame — .frame
     └── .ctrl-frame (3 columns)
         ├── Col 01: Frequency Control
         │   ├── Mode select (#modeSel)
         │   ├── Preset select (#presetSel) [hidden unless preset mode]
         │   ├── Frequency range + number (#freqDial, #freqNum)
         │   └── File input (#fileIn) [hidden unless track mode]
         ├── Col 02: Audio Engine
         │   ├── Start/Stop buttons (#btnAudio, #btnStop)
         │   ├── Volume slider (#volSlider)
         │   └── Particle count slider + number (#particleSlider, #particleNum)
         └── Col 03: Initiate Sequence (info copy + hint text)
  10. Spacer
  11. About section — .frame with 2-col .info-section
      ├── Col 1: About the Portal
      └── Col 2: Nāda Brahma (gold accent)
  12. Spacer
  13. Marquee bar (bottom, normal direction)
  14. Spacer
  15. Footer — .frame with .footer-bar
  16. Spacer
</div>
```

**Marquee content** (duplicate each set for seamless loop):
- Top: SYSTEM 001 · CYMATICS ENGINE · नाद ब्रह्म · BOOT SEQUENCE INITIATED · द्वार · PARTICLE MADNESS · HEALING FREQUENCIES · स्पन्दन · NĀDA BRAHMA
- Mid: PORTAL 1 OF ∞ · द्वार · CORE CAPACITY · SOLFEGGIO 528 Hz · आवृत्ति · SACRED GEOMETRY · AETHER CANVAS · कम्पन (reverse, 28s)
- Bottom: PORTAL 1 OF ∞ · MAIN DRIVE STATUS · स्पन्दन · CYMATICS PORTAL · द्वार · PARTICLE MADNESS · CORE CAPACITY (36s)

Each marquee item is a `<span>`, dots are `<span class="dot"></span>`, Sanskrit is `<span class="jp">`.

### Step 4 — Inline the dat.GUI helper

Paste the full `attachMovableDatGui()` function (from `Particle/js/dat-gui-panel.js`) into a `<script>` block immediately before the main engine script. Do not modify it.

### Step 5 — Inline the full cymatics engine

Copy the entire IIFE from `Particle/experiments/cymatics/index.html` into a `<script>` block.

Make **only these adaptations** — do not change anything else:

#### 5a — Canvas injection target
In the original, Three.js canvas is appended to `document.body`. Change the renderer injection to:
```js
// ORIGINAL:
// document.body.appendChild(renderer.domElement);

// REPLACE WITH:
var container = document.getElementById('portal-container');
container.insertBefore(renderer.domElement, container.firstChild);
```

#### 5b — Resize function
Update `resize()` to read dimensions from `portal-container` rather than `window`:
```js
function resize() {
  var rect = container.getBoundingClientRect();
  var w = rect.width, h = rect.height;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, true);
}
```

#### 5c — Readout target
The `#readout` element is inside `.status-bar` in the portal section (not in a floating panel). Ensure:
```js
var readout = document.getElementById('readout');
```
...points to the status bar readout. The text content format is:
```
Particles: N · Drive Hz: X.X · Lobes ~Y
```

#### 5d — Remove floating panel HTML
The original has a draggable `#cym-shell` floating panel. In the portal version, all controls are in the Nifty `.ctrl-frame` columns — the floating panel is NOT rendered. Remove references to:
- `cymShell`, `cymHeader`, `cymMinBtn`, `panelRestore`, `panel-hide`, `panel-restore`
- Drag setup (`setupCymDrag`)
- Minimize logic

Keep all audio logic, frequency sync, mode switching, file loading — just no floating shell.

#### 5e — Wire dat.GUI
After building all SC controllers, call:
```js
attachMovableDatGui(gui, {
  title: 'Advanced Visual Controls',
  initialTop: 20,
  initialRight: 20,
  zIndex: 500
});
```

#### 5f — H key hotkey
```js
window.addEventListener('keydown', function(e) {
  if ((e.key === 'h' || e.key === 'H') && gui && gui.__pmDatGuiToggleVisibility) {
    gui.__pmDatGuiToggleVisibility();
  }
});
```

### Step 6 — Wire canvas border-radius

After creating the renderer:
```js
renderer.domElement.style.borderRadius = 'var(--radius)';
```

### Step 7 — Particle cap label

```js
document.getElementById('particleCapLabel').textContent = String(PARTICLE_CAP);
```

### Step 8 — Final checks

Run through this checklist before finishing:

- [ ] Three.js r76 CDN loads (uses `addAttribute`, not `setAttribute`)
- [ ] dat.GUI CDN loads before the engine script
- [ ] Canvas renders inside `#portal-container`, fills the frame
- [ ] Status bar readout updates every frame
- [ ] Mode select shows/hides preset row and track row correctly
- [ ] Start Audio button triggers oscillator (manual/preset mode)
- [ ] Stop button kills all audio
- [ ] File input triggers MediaElementSource → Analyser chain
- [ ] Particle slider rebuilds geometry with debounce
- [ ] Scroll wheel zooms camera
- [ ] Mouse move creates parallax
- [ ] H key toggles dat.GUI
- [ ] Responsive: at 768px controls go to 1-col layout
- [ ] No `<form>` tags anywhere
- [ ] No console errors on load

---

## Common Pitfalls

| Pitfall | Fix |
|--------|-----|
| `geom.setAttribute is not a function` | You're using a Three.js version > r76. Must use `geom.addAttribute()` |
| Canvas is 0×0 or wrong size | `resize()` must read from `container.getBoundingClientRect()`, not `window.innerWidth` |
| Audio doesn't start | AudioContext needs user gesture — `btnAudio` click handler must call `audioCtx.resume()` |
| dat.GUI appears behind canvas | Set `zIndex: 500` in `attachMovableDatGui` options |
| Marquee jumps | Ensure both halves of content are identical and `translateX(-50%)` ends the animation |
| Particles not colouring | `geom.attributes.color.needsUpdate = true` must be called every frame |
