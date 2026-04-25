# Browser & Device Compatibility Guide

## Cymatics Portal (this repo)

The fixes below were **applied to Cymatics Portal** (`_portal_nifty.css`, `visual-fullscreen-ui.js`, `experiments/cymatics/index.html`): global Safari resets, `-webkit-` prefixes on marquee transforms, `aspect-ratio` fallback for `.portal-section`, flex `gap` fallbacks, `-webkit-sticky` on the guide CTA strip, `-webkit-backdrop-filter` ordering, WebGL `alpha` / `powerPreference` / `webglcontextlost` handling, and moving scroll/overflow lock from `body` to `#portal-container` during CSS fullscreen to reduce iOS Safari scroll quirks.

Rebuild with `python _build_portal.py` after editing sources.

---

## Double Slit Experiment — reference template

The following sections were originally written for **Double Slit Experiment** and remain as a **generic checklist** for Safari / iOS and WebGL.

**Example live URL:** https://www.doubleslitexperiment.app  
**Example audience:** UK schools (Chromebooks, iPads, desktops)

---

## Target Browser Matrix

| Browser | Version | Priority | Notes |
|---------|---------|----------|-------|
| Chrome | 90+ | Primary | Most school Chromebooks |
| Safari | 15+ | Primary | iPad/Mac in schools, iOS devices |
| Firefox | 90+ | Secondary | Some school desktops |
| Edge | 90+ | Secondary | Windows school PCs |
| Safari iOS | 15+ | Primary | iPhone/iPad |
| Chrome Android | 90+ | Secondary | Android tablets |

---

## Known Safari Issues & Fixes

### 1. Hero Image Rendering

**Symptom:** Hero section images (1.png–5.png) display differently in Safari vs Chrome — wrong sizing, positioning, or animation behaviour.

**Common Causes & Fixes:**

#### a) `object-fit` on images inside flex/grid containers
Safari sometimes ignores `object-fit` when the image's parent has certain flex properties.

```css
/* Fix: Wrap image in a container and apply sizing to the container */
.hero-image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.hero-image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

#### b) CSS `transform` and `animation` differences
Safari handles `transform` origins and composite animations differently.

```css
/* Always include -webkit- prefix for transforms in keyframes */
@keyframes heroFade {
  0% {
    opacity: 0;
    -webkit-transform: scale(1.05);
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    -webkit-transform: scale(1);
    transform: scale(1);
  }
}

.hero-image {
  -webkit-animation: heroFade 1s ease-out forwards;
  animation: heroFade 1s ease-out forwards;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
```

#### c) `will-change` and GPU compositing
Safari aggressively manages GPU layers differently from Chrome.

```css
/* Use sparingly — only on actively animating elements */
.hero-image.animating {
  will-change: transform, opacity;
  -webkit-transform: translateZ(0); /* Force GPU layer in Safari */
  transform: translateZ(0);
}
```

#### d) Image aspect ratio and `aspect-ratio` property
Older Safari versions (pre-15) don't support `aspect-ratio`. Use padding-bottom hack as fallback.

```css
.hero-image-wrapper {
  aspect-ratio: 16 / 9;
}

/* Fallback for older Safari */
@supports not (aspect-ratio: 16 / 9) {
  .hero-image-wrapper {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
  }
  .hero-image-wrapper img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
```

#### e) `background-image` with `background-size: cover`
If hero images use CSS backgrounds rather than `<img>` tags:

```css
.hero-section {
  background-image: url('/img/1.png');
  background-size: cover;
  background-position: center center;
  -webkit-background-size: cover; /* Legacy Safari */
}
```

### 2. Scroll-based Animations

Safari handles `IntersectionObserver` and scroll events with slight timing differences.

```javascript
// Use IntersectionObserver with rootMargin for Safari consistency
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  }
);
```

### 3. CSS `gap` in Flexbox

Older Safari (pre-14.1) doesn't support `gap` in flexbox. Use margin fallback:

```css
.flex-container {
  display: flex;
  gap: 1rem;
}

/* Fallback */
@supports not (gap: 1rem) {
  .flex-container > * + * {
    margin-left: 1rem;
  }
}
```

### 4. `backdrop-filter` (Blur Effects)

```css
.glass-effect {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
```

### 5. SVG Rendering

Safari can render SVG filters and masks differently. Always set explicit `width` and `height` on SVGs.

### 6. Smooth Scrolling

```css
html {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch; /* iOS momentum scrolling */
}
```

---

## Three.js / WebGL (Demo Page) Compatibility

### Safari WebGL Notes

| Feature | Safari Support | Workaround |
|---------|---------------|------------|
| WebGL 2.0 | Safari 15+ | Feature-detect, fallback to WebGL 1 |
| Float textures | Partial | Check `OES_texture_float` extension |
| Antialiasing | Different defaults | Explicitly set `antialias: true` in renderer |
| devicePixelRatio | Can be 2x or 3x on Retina | Cap at 2 for performance |

```javascript
// Renderer setup with Safari compatibility
const renderer = new THREE.WebGLRenderer({
  canvas: canvasElement,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});

// Cap pixel ratio for performance on Retina displays
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

### iOS-specific WebGL Limits

- Max texture size: 4096×4096 (vs 8192+ on desktop)
- Limited number of active WebGL contexts
- Background tabs may lose WebGL context — handle `webglcontextlost` event

```javascript
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  // Pause rendering, show message
});

canvas.addEventListener('webglcontextrestored', () => {
  // Reinitialize scene
});
```

---

## Performance Targets by Device

| Device | Target FPS | Max Particles | Quality |
|--------|-----------|---------------|---------|
| MacBook Pro (M-series) | 60 | 2000 | High |
| iPad (A12+) | 60 | 1000 | Medium |
| School Chromebook (N4500) | 30 | 500 | Low |
| iPhone (A13+) | 60 | 800 | Medium |
| Older iPad (A10) | 30 | 300 | Low |

---

## CSS Reset / Normalisation Checklist

Ensure these are in your global styles:

```css
/* Box sizing */
*, *::before, *::after {
  box-sizing: border-box;
}

/* Remove default margins */
body, h1, h2, h3, h4, p, figure, blockquote, dl, dd {
  margin: 0;
}

/* Safari font rendering */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Safari image handling */
img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
  height: auto;
}

/* Safari input styling */
input, button, textarea, select {
  font: inherit;
  -webkit-appearance: none;
  appearance: none;
}

/* Prevent iOS text size adjust */
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
```

---

## Testing Checklist

Before each deployment, verify:

- [ ] Homepage hero images render correctly in Safari macOS
- [ ] Homepage hero images render correctly in Safari iOS (iPhone + iPad)
- [ ] Homepage animations play in Safari
- [ ] Demo page (/demo/) loads WebGL context in Safari
- [ ] Demo page particles render in Safari
- [ ] All fonts load correctly across browsers
- [ ] No console errors (MIME type, module loading, 404s)
- [ ] Responsive breakpoints work on iPad (768px, 1024px)
- [ ] Touch interactions work on iOS (pinch-zoom, tap)
- [ ] `backdrop-filter` effects visible in Safari

---

## Cursor Prompt for Safari Fix

Use this prompt in Cursor to diagnose and fix the current mobile Safari issues:

```
The site at https://www.doubleslitexperiment.app has two categories of bugs on mobile Safari (iOS 15+, iPhone and iPad). Reference BROWSER-COMPATIBILITY.md in the project root for the full compatibility guide.

BUG 1 — Hero images wrong size/position on mobile Safari
The hero section uses images (img/1.png through img/5.png) that display at incorrect sizes or positions on mobile Safari while looking correct on Chrome.

Investigate and fix all of the following:
a) Check every hero image and its parent container for `object-fit` usage inside flex or grid parents — Safari ignores `object-fit` in this context. Fix by wrapping each image in an absolutely-positioned container (see §1a in BROWSER-COMPATIBILITY.md).
b) Check for `aspect-ratio` CSS without a `@supports not` fallback — older Safari doesn't support it. Add the padding-bottom percentage hack as fallback (see §1d).
c) Check if hero images use `background-image` with `background-size: cover` — add `-webkit-background-size: cover` if so (see §1e).
d) Ensure every `<img>` tag has explicit `width` and `height` HTML attributes to prevent layout shift on Safari.
e) Check for any `transform` or `animation` CSS on hero images missing `-webkit-` prefixes and add them (see §1b).
f) Check if `will-change` is applied to non-animating elements and remove it — Safari over-allocates GPU layers (see §1c).
g) Test the viewport meta tag is set correctly: `<meta name="viewport" content="width=device-width, initial-scale=1">` — Safari iOS respects this differently than Chrome if `maximum-scale` or `user-scalable` are set.

BUG 2 — Layout and spacing broken on mobile Safari
Elements have wrong margins, padding, gaps, or overall page structure breaks on mobile Safari.

Investigate and fix all of the following:
a) Search the entire codebase for `gap` used in `display: flex` containers. Safari pre-14.1 doesn't support flexbox `gap`. Add a `@supports not (gap: 1rem)` fallback using `margin` on child elements for every instance (see §3 in BROWSER-COMPATIBILITY.md).
b) Check for any use of `dvh`, `svh`, `lvh` viewport units — older mobile Safari only supports `vh`. The iOS Safari address bar causes `100vh` to overflow; use `100dvh` with a `100vh` fallback:
   ```css
   .full-height {
     height: 100vh;
     height: 100dvh;
   }
   ```
c) Check if the CSS reset includes these Safari-specific rules — add any that are missing:
   - `*, *::before, *::after { box-sizing: border-box; }`
   - `html { -webkit-text-size-adjust: 100%; }`
   - `body { -webkit-font-smoothing: antialiased; }`
   - `img, picture, video, canvas, svg { display: block; max-width: 100%; height: auto; }`
   - `input, button, textarea, select { -webkit-appearance: none; }`
d) Check for `position: sticky` — Safari requires `-webkit-sticky` as fallback.
e) Check for any `backdrop-filter` without `-webkit-backdrop-filter` and add the prefix.
f) Check all responsive breakpoints at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad mini), and 1024px (iPad). Safari iOS calculates available width differently when the address bar is visible.
g) Check if `overflow-x: hidden` on `<html>` or `<body>` is causing scroll-locking on iOS Safari — this is a known Safari bug. If used, move it to a wrapper `<div>` instead.
h) Search for `-webkit-overflow-scrolling: touch` — it should be present on any scrollable container for momentum scrolling on iOS.

GENERAL:
- Check for any JS module loading issues — the console has shown MIME type errors for advanced-main.js and help-modal.js. Fix the script paths and ensure correct MIME types.
- After all fixes, verify no console errors or warnings remain.
- Commit with message: "fix(safari): hero image sizing and layout/spacing fixes for mobile Safari"
- Push to main.
```
