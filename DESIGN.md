# CYMATICS PORTAL — DESIGN.md

## Design Language

**Nifty Portal × Particle Madness** — Retro-futuristic monochrome brutalism with cymatics accent colours. Think: early internet terminal meets sacred geometry instrument.

---

## Colour System

### Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--cream` | `#fff8e0` | All borders, text, dots, headings |
| `--dark` | `#1b1b1b` | All panel backgrounds |
| `--bg` | `#030508` | Page background + Three.js clear colour |
| `--accent-cyan` | `#55f8ff` | Focus states, hover glows, status readout hi |
| `--accent-gold` | `#ffb84d` | Status bar readout, Nāda Brahma heading |
| `--glow` | `rgba(255,248,224,0.06)` | Subtle inner glow on frames |

### Three.js Particle Palette

| Role | Colour |
|------|--------|
| `colorLow` (trough) | `#0a2858` — deep indigo |
| `colorMid` (mid height) | `#ffb84d` — gold (matches accent-gold) |
| `colorHigh` (crest) | `#55f8ff` — cyan (matches accent-cyan) |

Audio-reactive colours override these dynamically via HSV rotation when audio is playing.

---

## Typography

```css
font-family: 'Courier New', Courier, monospace;
```

| Element | Size | Case | Tracking |
|---------|------|------|---------|
| H1 (title) | clamp(28px, 5vw, 72px) | UPPERCASE | 0.15em |
| H2 (section) | clamp(16px, 1.8vw, 26px) | UPPERCASE | 0.10em |
| H3 (col heading) | clamp(12px, 1.1vw, 15px) | UPPERCASE | 0.14em |
| Marquee text | clamp(11px, 1.3vw, 16px) | UPPERCASE | 0.12em |
| Sanskrit (.jp) | clamp(14px, 1.6vw, 20px) | — | 0 |
| Body / p | clamp(11px, 1vw, 14px) | Normal | — |
| Labels | 10px | UPPERCASE | 0.10em |
| Status bar | 11px | UPPERCASE | 0.08em |
| Hints | 10px | Normal | — |
| Footer | 11px | UPPERCASE | 0.10em |

---

## Layout

### Page Wrapper
```css
.portal-main {
  width: 95%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 1.5vw 0;
}
```

### Spacer
```css
.spacer {
  height: 1.2vw;
  min-height: 8px;
}
```

---

## The Frame System (Nifty core component)

Every section is wrapped in a `.frame`. The frame draws its cream border using pseudo-elements + explicit child `.edge-l` and `.edge-r` divs (because `::before`/`::after` only give us top/bottom):

```html
<div class="frame">
  <div class="edge-l"></div>
  <div class="edge-r"></div>
  <!-- content -->
</div>
```

```css
.frame {
  position: relative;
  border-radius: var(--radius);   /* 16px */
  background: var(--dark);         /* #1b1b1b */
  overflow: hidden;
}

/* Top border */
.frame::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: var(--border-w);         /* 3px */
  background: var(--cream);
  border-radius: var(--radius) var(--radius) 0 0;
  z-index: 5;
}

/* Bottom border */
.frame::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: var(--border-w);
  background: var(--cream);
  border-radius: 0 0 var(--radius) var(--radius);
  z-index: 5;
}

/* Left border */
.frame .edge-l {
  content: '';
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: var(--border-w);
  background: var(--cream);
  z-index: 5;
}

/* Right border */
.frame .edge-r {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: var(--border-w);
  background: var(--cream);
  z-index: 5;
}
```

---

## Marquee Bar

```css
.marquee-bar {
  height: 4.2vw;
  min-height: 36px;
  max-height: 54px;
  display: flex;
  align-items: center;
}

.marquee-track {
  display: flex;
  align-items: center;
  gap: 2.5vw;
  white-space: nowrap;
  animation: scroll-left 32s linear infinite;
  /* reverse direction: animation-direction: reverse */
}

.marquee-track .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--cream);
  opacity: 0.4;
  flex-shrink: 0;
}

.marquee-track .jp {
  opacity: 0.7;
  /* slightly larger, no letter-spacing */
}

@keyframes scroll-left {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

The inner wrapper:
```html
<div style="overflow:hidden;width:100%;height:100%;display:flex;align-items:center;padding:0 8px;">
  <div class="marquee-track">
    <!-- content × 2 for seamless loop -->
  </div>
</div>
```

---

## Portal Section (Canvas Frame)

```css
.portal-section {
  position: relative;
  aspect-ratio: 16 / 10;
  min-height: 420px;
}

.portal-section canvas {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  border-radius: var(--radius);
}
```

### Status Bar (inside portal section)
```css
.status-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: linear-gradient(0deg, rgba(8,10,20,0.92), transparent);
  border-radius: 0 0 var(--radius) var(--radius);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cream);
  opacity: 0.85;
}

.status-bar .readout { color: var(--accent-gold); font-variant-numeric: tabular-nums; }
.status-bar .jp-label { opacity: 0.5; font-size: 13px; }
```

Status bar layout:
```html
<div class="status-bar">
  <span class="jp-label">नाद ब्रह्म · CYMATICS</span>
  <span class="readout" id="readout">Drive Hz: 528 · Lobes ~5</span>
  <span>SYSTEM 001 · <span class="jp-label">द्वार</span></span>
</div>
```

---

## Controls Frame

### 3-Column Grid
```css
.ctrl-frame {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

.ctrl-col {
  padding: 18px 22px;
  border-right: var(--border-w) solid var(--cream);
}
.ctrl-col:last-child { border-right: none; }
```

### Column Heading
```css
.ctrl-col h3 {
  font-size: clamp(12px, 1.1vw, 15px);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--cream);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Numbered badge */
.ctrl-col h3 .num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px; height: 22px;
  border-radius: 4px;
  background: var(--cream);
  color: var(--dark);
  font-size: 10px;
  font-weight: 700;
}
```

Column headings: `<span class="num">01</span> Frequency Control`

---

## Form Controls (Nifty-styled)

```css
/* Row wrapper */
.ctrl-row { margin-bottom: 12px; }
.ctrl-row label {
  display: block;
  margin-bottom: 5px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.6;
}

/* Select + number inputs */
select, input[type="number"] {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,248,224,0.2);
  background: rgba(255,248,224,0.06);
  color: var(--cream);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
}
select:focus, input[type="number"]:focus {
  border-color: var(--accent-cyan);
}

/* Range slider */
input[type="range"] {
  width: 100%;
  accent-color: var(--accent-cyan);
  height: 4px;
  cursor: pointer;
}

/* File input */
input[type="file"] {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px dashed rgba(255,248,224,0.25);
  background: transparent;
  color: var(--cream);
  font-size: 11px;
  cursor: pointer;
}

/* Freq row (slider + number inline) */
.freq-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.freq-row input[type="number"] { width: 90px; flex-shrink: 0; }
```

---

## Buttons

```css
.btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

button {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255,248,224,0.35);
  background: linear-gradient(180deg, rgba(255,248,224,0.08), rgba(255,248,224,0.02));
  color: var(--cream);
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: all 0.2s;
}
button:hover {
  background: rgba(255,248,224,0.12);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

/* Primary CTA (Start Audio) */
button.primary {
  background: var(--cream);
  color: var(--dark);
  font-weight: 700;
  border-color: var(--cream);
}
button.primary:hover {
  background: var(--accent-cyan);
  border-color: var(--accent-cyan);
}
```

---

## Info / About Section

```css
.info-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.info-col {
  padding: 24px 28px;
  border-right: var(--border-w) solid var(--cream);
}
.info-col:last-child { border-right: none; }

.info-col h2 {
  font-size: clamp(16px, 1.8vw, 26px);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.info-col p {
  font-size: clamp(11px, 1vw, 14px);
  line-height: 1.6;
  opacity: 0.7;
}

.info-col .arrows {
  margin-top: 10px;
  opacity: 0.3;
  font-size: 10px;
  letter-spacing: 0.2em;
}
/* Arrow content: >>>>>>>>>>>>>>>>>>>>>>>>> */
```

---

## Footer

```css
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2vw;
  padding: 14px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.5;
}
.footer-bar .sep {
  width: 1px; height: 14px;
  background: var(--cream);
  opacity: 0.3;
}
```

Footer content: `CYMATICS PORTAL 2026 | PARTICLE MADNESS | नाद ब्रह्म`

---

## Title Area

```css
.title-area {
  text-align: center;
  padding: 2vw 0 0.5vw;
}
.title-area h1 {
  font-size: clamp(28px, 5vw, 72px);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--cream);
  text-shadow: 0 0 60px rgba(255,248,224,0.08);
}
.title-area .sub {
  font-size: clamp(10px, 1vw, 14px);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  opacity: 0.4;
  margin-top: 6px;
}
```

---

## Noise Overlay

```css
.noise {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.035;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
}
```

---

## Responsive Rules

```css
@media (max-width: 768px) {
  /* Controls: 3-col → 1-col */
  .ctrl-frame { grid-template-columns: 1fr; }
  .ctrl-col { border-right: none; border-bottom: var(--border-w) solid var(--cream); }
  .ctrl-col:last-child { border-bottom: none; }

  /* Info: 2-col → 1-col */
  .info-section { grid-template-columns: 1fr; }
  .info-col { border-right: none; border-bottom: var(--border-w) solid var(--cream); }
  .info-col:last-child { border-bottom: none; }
}
```

---

## Aesthetic Notes for Cursor

- **No drop shadows on frames** — the cream borders ARE the UI decoration
- **No gradients on backgrounds** — dark is flat `#1b1b1b`, bg is flat `#030508`
- **No rounded inputs** — keep 8px radius maximum, no pill shapes
- **No colour on text** — only cream and opacity variations, except status readout (gold) and hover states (cyan)
- **The Three.js canvas IS the hero** — everything else serves it
- **Sanskrit text adds mysticism** — always use `.jp` class for Devanagari, never translate or replace it
- **Arrow strings** (`>>>>>>>>>>>>>>>>>`) are a Nifty motif — use them as dividers in info cols
- The overall vibe: **a 1990s science terminal that also plays music and shows cymatics**
