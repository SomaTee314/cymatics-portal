# CYMATICS PORTAL — tech.md

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Vanilla JS (ES5-compatible, IIFE pattern) |
| 3D / Particles | Three.js r76 — `https://cdnjs.cloudflare.com/ajax/libs/three.js/r76/three.min.js` |
| Advanced GUI | dat.GUI 0.7.9 — `https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js` |
| Audio | Web Audio API (AudioContext, OscillatorNode, AnalyserNode, MediaElementSourceNode) |
| Fonts | Google Fonts: Courier New (system) + optionally PP NeueBit via import |
| Build | None — single `index.html`, no bundler, no framework |
| Hosting | Any static host (Vercel, Netlify, GitHub Pages) |

## File Structure

```
cymatics-portal/
├── index.html          ← entire app (HTML + CSS + JS inlined)
└── (no other files required)
```

## Three.js Architecture (from Particle Madness source — preserve exactly)

```
Scene
├── FogExp2 (BG colour, density SC.fogDensity)
├── AmbientLight (0x406090, 0.45)
└── Points (geom + PointsMaterial)
    ├── BufferGeometry
    │   ├── 'position' BufferAttribute (Float32Array, N×3)
    │   └── 'color'    BufferAttribute (Float32Array, N×3)
    └── PointsMaterial
        ├── vertexColors: THREE.VertexColors
        ├── blending: THREE.AdditiveBlending
        ├── depthWrite: false
        └── sizeAttenuation: true

Camera: PerspectiveCamera(48°, aspect, 0.02, 80)
  position: (0, 0.08, 2.5) — mouse parallax + scroll zoom applied per frame
```

## Audio Pipeline (preserve exactly)

### Mode: Manual / Preset
```
OscillatorNode (sine, hz) → GainNode (vol×0.22) → AnalyserNode (toneAnalyser, fftSize=1024) → destination
```
- `toneAnalyser` feeds RMS for colour drive when audio is playing

### Mode: Track (FFT)
```
Audio element → MediaElementSourceNode → AnalyserNode (fftSize=8192, smoothing=0.38) → destination
```
- FFT array feeds `analyzeTrackAudio()` for dominant Hz, spectral centroid, band energies, transient detection

## Key Engine Functions (do not rename or restructure)

| Function | Purpose |
|----------|---------|
| `waveHeight(r, theta, time, hz, amp, audio)` | Chladni standing-wave maths — heart of the visualiser |
| `driveFrequencyAndLevel(time)` | Master per-frame driver — returns `{hz, level, snap}` |
| `analyzeTrackAudio()` | Full FFT band analysis + centroid smoothing |
| `heightToColor(h, transient, arr, ix, snap)` | Maps wave height → RGB in colour buffer |
| `buildAudioPaletteStops(snap, transient)` | Audio-reactive HSV colour generation |
| `rebuildParticles(newN)` | Tears down + rebuilds BufferGeometry for new particle count |
| `seedDiskParticles(n, ...)` | Fills polar coordinate arrays for disk distribution |
| `animate()` | RAF loop — updates positions + colours + camera |

## SC (Simulation Constants) Object — preserve all keys

```js
var SC = {
  timeWarp:1, motionGain:1.12, interference:0.78, fineRipple:0.45,
  fftSmoothing:0.22, trackBlend:0.12, zExtrude:0.48, pointSizeMul:1,
  fogDensity:0.045, centroidBlend:0.58, trackHzSpeed:1.25, fluxDecay:0.88,
  bandSnap:0.95, rmsWeight:1.05, spectralLevelWeight:1, transientGain:1.1,
  subWeight:0.55, beatPunch:1.15, bandMotion:0.95, transientRipple:0.62,
  colorVibrance:1.05, colorBeatBoost:1, colorMidpoint:0.38,
  audioReactiveColors:true, audioColorAmount:1,
  audioHueSpread:1, audioSatBoost:0.85, audioBrightBoost:0.65
};
```

## dat.GUI Advanced Panel

- Load `dat.gui.min.js` from CDN
- Inline the `attachMovableDatGui()` helper (from `dat-gui-panel.js`)
- Wire `H` key to toggle GUI visibility: `gui.__pmDatGuiToggleVisibility()`
- GUI exposes: timeWarp, motionGain, interference, fineRipple, zExtrude, fogDensity, centroidBlend, trackBlend, pointSizeMul, colorVibrance, audioReactiveColors, audioColorAmount, audioHueSpread, audioSatBoost, audioBrightBoost, colorMidpoint, colorBeatBoost

## CSS Variables (Nifty design tokens)

```css
:root {
  --cream:        #fff8e0;
  --dark:         #1b1b1b;
  --bg:           #030508;
  --border-w:     3px;        /* Nifty uses 4px; 3px works at all sizes */
  --radius:       16px;
  --glow:         rgba(255, 248, 224, 0.06);
  --accent-cyan:  #55f8ff;
  --accent-gold:  #ffb84d;
}
```

## Particle Limits

```js
var PARTICLE_MIN = 2500;
var PARTICLE_CAP = 320000;
// Default on load: 14000
// Slider: min=2500, max=320000, step=500
```

## Responsive Breakpoints

| Breakpoint | Change |
|-----------|--------|
| ≤768px | Controls grid: 3-col → 1-col; Info grid: 2-col → 1-col; border-bottom replaces border-right on cols |
| All sizes | Canvas aspect-ratio 16/10, min-height 420px |

## Browser Constraints

- Audible sine output browser-capped ~20 kHz; visual dial still drives up to 25 kHz
- AudioContext requires user gesture to start (handled by btnAudio click)
- `webkitAudioContext` fallback included
- `devicePixelRatio` capped at 2 to prevent GPU overload
- Particle rebuild is debounced 130ms on slider drag
