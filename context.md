# CYMATICS PORTAL — context.md

## Project Overview

**Cymatics Portal** is a single-page web application that fuses two source projects into one cohesive experience:

1. **Nifty Portal** — a retro-futuristic, cream-on-dark UI design system with cream `#fff8e0` borders, `#1b1b1b` dark panels, marquee tickers, Courier New monospace typography, and thick ruled-border "frame" sections.
2. **Particle Madness Cymatics Engine** — a Three.js (r76) particle visualiser that renders Chladni standing-wave patterns driven by frequency, with full audio reactivity: manual tone, Solfeggio healing presets, and uploaded audio track FFT analysis.

## Core Requirement

> **The full cymatics audio engine must be preserved 100% intact** — every control, every audio mode, all Solfeggio presets, the FFT track upload, oscillator, analyser chain, waveHeight maths, colour system, and dat.GUI advanced panel. Nothing from the Particle Madness cymatics engine is simplified, removed, or replaced.

## What the App Is

A single HTML file (no build step, no framework) that:
- Wraps the cymatics engine in the Nifty Portal visual shell
- Shows the Three.js canvas as the centrepiece inside a Nifty-style bordered frame
- Presents all audio controls in Nifty-styled column panels below the canvas
- Adds marquee tickers (top, middle, bottom) with Vedic Sanskrit + English copy
- Has a title area, about section, and footer — all in Nifty design language
- Keeps the dat.GUI advanced panel accessible (H hotkey) for power users

## Source Files

| Source | Role |
|--------|------|
| `Particle/experiments/cymatics/index.html` | **Primary** — full engine JS + audio logic |
| `Particle/js/dat-gui-panel.js` | Advanced GUI wrapper (must be inlined) |
| `Particle/js/pm-reactive-audio-panel.js` | Audio panel reference (logic already in cymatics) |
| `Particle/js/three.r76.min.js` | Three.js — load from CDN |
| `Nifty Portal/css/nifty-portal.css` | Design tokens reference |
| `Nifty Portal/index.html` | Layout reference |

## Deliverable

A single self-contained `index.html` file. No npm, no bundler. CDN for Three.js r76 and dat.GUI.

## Audience

- Direct users of the Cymatics Portal (web, desktop, mobile)
- Developers extending from this base (e.g. AETHER CANVAS, SONICPRINT spin-offs)

## Brand Voice / Copy

- Marquee text: English ALLCAPS + Sanskrit Devanagari (नाद ब्रह्म, द्वार, स्पन्दन, आवृत्ति, कम्पन)
- Title: **CYMATICS PORTAL**
- Subtitle: *Particle Madness × Nifty Portal*
- Tagline: *Sound is the creator* / *Nāda Brahma*
- Tech readout: `Particles: N · Drive Hz: X · Lobes ~Y`
