# CYMATICS PORTAL — README for Cursor

> **READ THIS ENTIRE FILE BEFORE DOING ANYTHING ELSE.**
> This file tells you exactly which source files exist, where they are, and precisely how to use them.

---

## What You Are Building

A single `index.html` file called **Cymatics Portal** — a retro-futuristic cymatics visualiser that combines:

- The **Nifty Portal** visual shell (cream-on-dark bordered frames, marquee tickers, Courier New monospace)
- The **Particle Madness cymatics engine** (Three.js r76 particle system, Chladni standing-wave physics, full Web Audio API integration)

Deliverable: **one self-contained `index.html`** with no build step, no framework, no npm.

---

## Workspace File Map

Your workspace contains the following. **Engine sources** ship as `Particle Source.zip` (and optional `Nifty Portal Source.zip` for reference). Extract `Particle Source.zip` so the `Particle/` tree exists (or run `_build_portal.py`, which reads from `_extract_particle/Particle/` after you unpack there once).

```
CymaticsPortal/
│
├── README.md                          ← this file (read first)
├── context.md                         ← project overview + goals
├── tech.md                            ← full technical spec
├── agent.md                           ← step-by-step build instructions
├── DESIGN.md                          ← complete Nifty design system
├── index.html                         ← deliverable (run `python _build_portal.py` to regenerate)
├── _build_portal.py                   ← merges cymatics IIFE + dat-gui + Nifty shell into index.html
├── _portal_nifty.css                  ← cached portal styles (generated on first build if missing)
│
├── Particle/                          ← after extracting Particle Source.zip
│   ├── experiments/
│   │   └── cymatics/
│   │       └── index.html             ← ⭐ PRIMARY SOURCE: full cymatics engine
│   └── js/
│       ├── dat-gui-panel.js           ← ⭐ PRIMARY SOURCE: attachMovableDatGui helper
│       ├── three.r76.min.js           ← Three.js r76 (use CDN instead, see below)
│       └── pm-reactive-audio-panel.js ← reference only, not needed directly
│
├── Particle Source.zip                ← original download (extract → Particle/ or _extract_particle/)
├── Nifty Portal Source.zip            ← optional reference (contains nifty-portal.css, etc.)
└── Nifty Portal/                      ← after extracting Nifty Portal Source.zip
    ├── index.html                     ← layout reference
    └── css/
        └── portal.thenifty.com/
            └── static_homepage/
                └── css/
                    └── nifty-portal.css  ← design token reference
```

---

## ⚠️ Critical Rule: Copy, Don't Reconstruct

**DO NOT rewrite, reconstruct, or reimplement the cymatics engine from scratch.**

The previous Cursor attempt failed because the source files were missing and Cursor had to guess at the engine logic. The source files are now present. Your job is to:

1. **Copy the cymatics IIFE verbatim** from `Particle/experiments/cymatics/index.html`
2. **Copy `attachMovableDatGui` verbatim** from `Particle/js/dat-gui-panel.js`
3. Apply **only the 6 specific adaptations** listed in Step 5 of `agent.md`
4. Wrap everything in the Nifty visual shell per `DESIGN.md`

If you find yourself rewriting `waveHeight()`, `analyzeTrackAudio()`, `buildAudioPaletteStops()`, or any other engine function — **stop**. Copy it from the source file instead.

---

## How to Extract the Source Code

### Step 1 — Get the cymatics engine IIFE

Open `Particle/experiments/cymatics/index.html`.

Find the main `<script>` block that begins with:
```js
(function () {
    var BG = 0x030508;
    var palette = { ...
```

Copy **everything** from `(function () {` to the closing `})();` — this is the entire engine. It is a large block (~600+ lines). Copy it completely.

### Step 2 — Get the dat.GUI helper

Open `Particle/js/dat-gui-panel.js`.

Copy the **entire file contents** — the `attachMovableDatGui` function and all its internals. You will inline this as a `<script>` block before the engine script.

### Step 3 — Do NOT copy these from the source

The following exist in `Particle/experiments/cymatics/index.html` but must **not** be carried into the new build:

- The `#cym-shell` floating panel HTML (the draggable UI panel)
- The `setupCymDrag()` function
- The minimize/expand logic (`cymMinimized`, `cymMinBtn`, `cymShell`)
- The `#panel-hide` / `#panel-restore` buttons
- References to `panelRestore`, `cymHeader`, `cymShell`

All controls move into the Nifty `.ctrl-frame` columns instead. The audio logic, frequency sync, mode switching, file upload, analyser chain — all of that stays.

---

## The 6 Adaptations (from agent.md Step 5)

After copying the IIFE verbatim, make **only these changes**:

### 5a — Canvas injection target
```js
// Find this pattern near the renderer setup:
// document.body.appendChild(renderer.domElement);
// OR: container = document.body; etc.

// Replace with:
var container = document.getElementById('portal-container');
container.insertBefore(renderer.domElement, container.firstChild);
```

### 5b — Resize reads from container, not window
```js
function resize() {
  var rect = container.getBoundingClientRect();
  var w = rect.width, h = rect.height;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, true);
}
window.addEventListener('resize', resize);
setTimeout(resize, 50);
```

### 5c — Readout element points to status bar
The `#readout` span lives inside `.status-bar` in the portal section HTML. Make sure:
```js
var readout = document.getElementById('readout');
```
...resolves to that element. The text format each frame must be:
```
Particles: N · Drive Hz: X.X · Lobes ~Y
```

### 5d — Remove the floating panel
Remove any code that references: `cymShell`, `cymHeader`, `cymMinBtn`, `panelRestore`, `cym-shell`, `panel-hide`, `panel-restore`, `setupCymDrag`, `cymMinimized`.

All controls (`#modeSel`, `#presetSel`, `#freqDial`, `#freqNum`, `#fileIn`, `#btnAudio`, `#btnStop`, `#volSlider`, `#particleSlider`, `#particleNum`) are already in the Nifty `.ctrl-frame` HTML — the engine IIFE binds to them by ID, so they will just work.

### 5e — Wire dat.GUI after building SC controllers
After the `gui` object is built and all folders/controllers are added:
```js
attachMovableDatGui(gui, {
  title: 'Advanced Visual Controls',
  initialTop: 20,
  initialRight: 20,
  zIndex: 500
});
```

### 5f — H key hotkey for dat.GUI
```js
window.addEventListener('keydown', function(e) {
  if ((e.key === 'h' || e.key === 'H') && gui && gui.__pmDatGuiToggleVisibility) {
    gui.__pmDatGuiToggleVisibility();
  }
});
```

### 5g — Canvas border-radius
```js
renderer.domElement.style.borderRadius = 'var(--radius)';
```

---

## Build Order Summary

Follow `agent.md` for the full detail. The high-level sequence is:

1. Create `index.html` with `<!DOCTYPE html>`, viewport meta, title
2. Add CDN script tags in `<head>`:
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r76/three.min.js"></script>
   ```
   *(Use CDN — do not use the local `three.r76.min.js` file path)*
3. Write all CSS in `<style>` per `DESIGN.md`
4. Write the full HTML body per `agent.md` Step 3
5. Add a `<script>` block with the full `attachMovableDatGui` function (from `dat-gui-panel.js`)
6. Add a `<script>` block with the full cymatics engine IIFE (from `Particle/experiments/cymatics/index.html`), with the 6 adaptations applied
7. Verify the checklist in `agent.md` Step 8

---

## Pre-Ship Checklist

Before declaring the build done, confirm every item:

- [ ] `Particle/experiments/cymatics/index.html` was opened and the IIFE was copied — not reconstructed
- [ ] `Particle/js/dat-gui-panel.js` was opened and `attachMovableDatGui` was copied — not reconstructed
- [ ] Three.js loads from CDN (`r76` — uses `addAttribute` not `setAttribute`)
- [ ] dat.GUI loads from CDN before the engine script
- [ ] Canvas renders inside `#portal-container` and fills the frame
- [ ] Status bar `#readout` updates every animation frame
- [ ] Mode select correctly shows/hides `#presetRow` and `#trackRow`
- [ ] Start Audio button fires oscillator in manual/preset mode
- [ ] Stop button kills all audio cleanly
- [ ] File input triggers `MediaElementSource → AnalyserNode` chain
- [ ] Particle slider rebuilds geometry with 130ms debounce
- [ ] Scroll wheel zooms camera (`zoom` var, clamped −0.7 to 1.1)
- [ ] Mouse move creates parallax on camera position
- [ ] `H` key toggles dat.GUI panel
- [ ] No `<form>` tags anywhere in the file
- [ ] No console errors on load in Chrome/Firefox
- [ ] At 768px or below, controls collapse to single column

---

## What the Previous Build Got Wrong

The previous Cursor session (exported transcript included in workspace) produced a working but **reconstructed** engine because the source files weren't present. Now that they are, the engine must come directly from source. The reconstructed version will have subtle differences in:

- `waveHeight()` maths (Chladni lobe count, interference terms, transient ripple)
- `buildAudioPaletteStops()` HSV rotation behaviour
- Band smoothing coefficients in `analyzeTrackAudio()`
- `SC` object defaults

These are all tuned values from the original project. Copy them exactly.

---

## Questions Cursor Might Ask — Pre-answered

**"The source IIFE references `document.getElementById('cym-shell')` — what do I do?"**
Remove all references to `cym-shell` and the floating panel as per Step 5d above.

**"Should I use the local `three.r76.min.js` or the CDN?"**
Always use the CDN URL. The local file is a backup reference only.

**"The IIFE calls `particleGoal()` which reads `window.location.hash` — keep it?"**
Yes, keep it. It's harmless and allows `#particles=NNNNN` URL overrides.

**"dat.GUI appears behind the Three.js canvas — how to fix?"**
`zIndex: 500` in the `attachMovableDatGui` call handles this.

**"Do I need the Nifty Portal HTML or CSS files?"**
Use them as reference only. The design is fully specified in `DESIGN.md` — do not copy Nifty's HTML structure directly as it is built for Webflow.
