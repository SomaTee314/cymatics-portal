# Cymatics Portal — Landing Page Implementation Spec

> **Purpose:** Add an interactive landing page to the Cymatics Portal that uses the Particle Source project's "second screen" mechanics — the colour-shifting particle background with the diamond-shaped **Go** button — as an entry point that transitions into an instruction guide, which then transitions into the main portal app.
>
> **For Cursor:** Copy all code, CSS, and markup **verbatim** from the source files referenced below. Do not reconstruct from description — use the exact source.

---

## 1. Architecture Overview

The landing page is a **full-viewport overlay** (`#landing-root`) rendered on top of the existing portal. It has **two states**:

### State A — Particle Attract Screen (initial load)
- Full-screen Three.js particle field (from Particle Source) with colour-cycling
- "Particle Madness" logo block (rebranded to "Cymatics Portal" / "By SomaTea")
- Diamond-shaped **Go** button (centre)
- Visual selector dropdown (choose demo/visual)
- **No audio** — purely visual attract mode

### State B — Instruction Guide
- Triggered when user clicks **Go**
- The particle background **remains visible** (dimmed/blurred behind overlay)
- Scrollable instruction guide content appears over the particles
- An **"Enter Portal"** CTA button at the bottom dismisses the entire landing overlay and reveals the main Cymatics Portal app beneath

### Main Portal App (existing)
- Everything currently in `index.html` — the Nifty shell, cymatics engine, controls
- Hidden (`display: none` or `visibility: hidden`) until State B's CTA is clicked
- On entry: existing `startAudio` / `animate()` initialisation fires

---

## 2. Source Files to Extract From

All paths relative to the Particle Source project root (`Particle/`):

| What | Source file | What to copy |
|------|-----------|--------------|
| **Particle engine** | `js/particle-love.com/js/index.js` | The entire bundled file — this is the minified Three.js particle system (modules 39–62). It self-initialises from `module 44` and renders to a `<canvas>` element. |
| **Three.js r76** | `js/particle-love.com/js/three.r76.min.js` | Required dependency — the particle engine is built against this version specifically. |
| **TweenMax** | `js/particle-love.com/js/TweenMax.min.js` | Required for all UI animations (quality selector, Go button, arrows, camera tweens). |
| **Landing CSS** | `css/particle-love.com/css/index.css` | Full stylesheet — Go button, quality selector, logo, arrows, menu, titles. |
| **Normalize CSS** | `css/particle-love.com/css/normalize.css` | Reset stylesheet. |
| **Motion blur texture** | `images/motion_blur.png` | Required by the particle renderer (module 52). |
| **HTML structure** | `index.html` | The `<body>` contents: `.iframe-container`, `.ui`, `.quality-selector`, `.close-btn`, and the `window.demoList` script block. |
| **Playfair Display font** | Google Fonts link | `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&display=swap` |

---

## 3. Integration into `_build_portal.py`

### 3.1 New files to add to `CymaticsPortal/`

```
CymaticsPortal/
├── landing/
│   ├── css/
│   │   ├── normalize.css          ← copy from Particle/css/particle-love.com/css/
│   │   └── landing.css            ← copy from Particle/css/particle-love.com/css/index.css
│   │                                 (renamed to avoid clash with portal's index.css)
│   ├── js/
│   │   ├── three.r76.min.js       ← copy verbatim
│   │   ├── TweenMax.min.js        ← copy verbatim
│   │   └── particle-landing.js    ← copy from Particle/js/particle-love.com/js/index.js
│   │                                 (renamed for clarity)
│   └── images/
│       └── motion_blur.png        ← copy verbatim
```

### 3.2 Modifications to `_build_portal.py`

The build script currently assembles `index.html` from:
- `shell_body_pre_scripts` (HTML shell)
- Various JS injection blocks
- `_portal_nifty.css` (inline `<style>`)

**Add the following to the build pipeline:**

#### A. In `<head>`, add before existing styles:
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./landing/css/normalize.css">
<link rel="stylesheet" href="./landing/css/landing.css">
```

#### B. Scope the landing CSS
The landing CSS uses global selectors (`html`, `body`, `canvas`, etc.) that will clash with the portal. **Wrap the landing CSS** so it only applies when `#landing-root` is present:

```css
/* At the top of landing.css, replace the html/body rules with: */
#landing-root {
    position: fixed;
    inset: 0;
    z-index: 9000;
    font-family: 'Playfair Display', serif;
    font-style: italic;
    background-color: #060a11;
    overflow: hidden;
    -webkit-user-select: none;
    user-select: none;
}

/* Prefix ALL other selectors with #landing-root */
/* e.g. .ui → #landing-root .ui */
/* e.g. .logo → #landing-root .logo */
/* e.g. .go-btn → #landing-root .go-btn */
/* e.g. .quality-selector → #landing-root .quality-selector */
/* etc. */
```

#### C. Insert landing HTML at the very start of `<body>`, before the portal shell

```html
<!-- ═══ LANDING OVERLAY ═══ -->
<div id="landing-root">
    <div class="iframe-container"></div>
    <div class="ui">
        <canvas></canvas>
        <div class="logo" style="opacity:1; transform:translate3d(0,0,0); cursor:pointer; pointer-events:auto;">
            <span class="logo-title">Cymatics Portal</span>
            <span class="logo-byline">By SomaTea</span>
        </div>
        <div class="menu">
            <div class="arrow is-left">
                <div class="arrow-inner">
                    <div class="arrow-part"></div>
                    <div class="arrow-part"></div>
                </div>
            </div>
            <div class="go-btn">
                <div class="go-btn-bg">
                    <div class="go-btn-bg-spinner">
                        <div class="go-btn-bg-inner"></div>
                    </div>
                </div>
                <div class="go-btn-text cache">Go</div>
            </div>
            <div class="arrow is-right">
                <div class="arrow-inner">
                    <div class="arrow-part"></div>
                    <div class="arrow-part"></div>
                </div>
            </div>
            <div class="titles-container">
                <label class="pm-demo-label" for="pm-demo-select">Choose visual</label>
                <select id="pm-demo-select" class="pm-demo-select" aria-label="Choose visual"></select>
                <div class="titles-move-container" aria-hidden="true"></div>
            </div>
        </div>
    </div>
    <div class="quality-selector" style="display:block; pointer-events:auto;">
        <div class="quality-btn" style="opacity:1; transform:translate3d(0,0,0);">
            <div class="quality-btn-bg"><div class="quality-btn-bg-spinner"><div class="quality-btn-bg-inner"></div></div></div>
            <div class="quality-btn-text cache">Low</div>
        </div>
        <div class="quality-btn" style="opacity:1; transform:translate3d(0,0,0);">
            <div class="quality-btn-bg"><div class="quality-btn-bg-spinner"><div class="quality-btn-bg-inner"></div></div></div>
            <div class="quality-btn-text cache">Medium</div>
        </div>
        <div class="quality-btn" style="opacity:1; transform:translate3d(0,0,0);">
            <div class="quality-btn-bg"><div class="quality-btn-bg-spinner"><div class="quality-btn-bg-inner"></div></div></div>
            <div class="quality-btn-text cache">High</div>
        </div>
        <div class="quality-title" style="opacity:1;">Please choose the quality of<br>the experience:</div>
    </div>

    <!-- ═══ INSTRUCTION GUIDE (State B — hidden until Go is clicked) ═══ -->
    <div id="landing-guide" style="display:none;">
        <div class="guide-backdrop"></div>
        <div class="guide-content">
            <h1 class="guide-title">Cymatics Portal &times; SomaTea</h1>

            <p class="guide-prose">Cymatics Portal is a gateway back to the oldest truth humanity ever knew: that the universe is not built from matter, but from vibration.</p>

            <p class="guide-prose">Across ancient civilizations&mdash;from the Vedic concept of <em>Nada Brahma</em> (&ldquo;the world is sound&rdquo;) to the Pythagorean belief in the &ldquo;music of the spheres&rdquo;&mdash;sound was understood as a living force that shapes consciousness and form.</p>

            <p class="guide-prose">Modern cymatics reveals what the ancients intuited: frequency creates geometry, and geometry creates experience. This app bridges that lineage into the present moment, weaving healing sound frequencies with reactive visual intelligence.</p>

            <p class="guide-prose">Each tone becomes a pattern, each pattern becomes a feeling, and each feeling becomes a step toward coherence. Cymatics Portal invites you to witness your inner world made visible, to let vibration guide you back into alignment, and to remember that you are not separate from the harmony&mdash;you are part of the song.</p>

            <blockquote class="guide-quote">
                &ldquo;If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.&rdquo;
                <cite>&mdash; Nikola Tesla</cite>
            </blockquote>

            <div class="guide-instructions">
                <h2>How to Use</h2>
                <div class="guide-step">
                    <span class="guide-step-badge">01</span>
                    <div>
                        <strong>Sound &amp; playback</strong>
                        <p>In the first column, choose an <strong>Audio Mode</strong>: <strong>Upload Track</strong> (pick an <strong>Audio file</strong>), <strong>Healing Presets</strong>, or <strong>Manual tone</strong>. Set <strong>Frequency</strong> when that mode uses it. Use <strong>Play</strong>, <strong>Pause</strong>, and <strong>Stop</strong>; adjust <strong>Volume</strong>. For an uploaded track, scrub the timeline and use the time readout.</p>
                    </div>
                </div>
                <div class="guide-step">
                    <span class="guide-step-badge">02</span>
                    <div>
                        <strong>Advanced visuals</strong>
                        <p>In the second column, pick an <strong>Audio-Visualiser Portal</strong> (<strong>Balanced</strong>, <strong>Mandelbrot</strong>, or <strong>Julia</strong>) and set <strong>Particle count</strong>. Press <strong>H</strong> for <strong>Advanced Visual Controls</strong>; drag the panel by its header or tap ↺ to reset position.</p>
                    </div>
                </div>
            </div>

            <div class="guide-enter-wrap">
                <div class="go-btn" id="enter-portal-btn">
                    <div class="go-btn-bg">
                        <div class="go-btn-bg-spinner">
                            <div class="go-btn-bg-inner"></div>
                        </div>
                    </div>
                    <div class="go-btn-text cache">Enter</div>
                </div>
                <p class="guide-enter-hint">Enter the Portal</p>
            </div>
        </div>
    </div>
</div>
<!-- ═══ END LANDING OVERLAY ═══ -->
```

#### D. Scripts — add before closing `</body>`, **before** the portal's own scripts

```html
<!-- Landing page engine -->
<script src="./landing/js/three.r76.min.js"></script>
<script src="./landing/js/TweenMax.min.js"></script>
<script>
    // Configure demoList with only the Cymatics entry for the landing
    window.demoList = [
        {
            id: 'cymatics',
            title: 'Cymatics',
            bgColor: '#030508',
            urls: {
                // These won't be used (no iframe navigation) — kept for engine compat
                low: '#',
                medium: '#',
                high: '#'
            },
            colors: [0x00a8ff, 0xffb84d, 0x3d5cff, 0xff6ec7],
            speeds: [1.0, 0.0032, 0.7, 0.5, 3.0, 3.4]
        }
    ];
</script>
<script src="./landing/js/particle-landing.js"></script>
```

#### E. Override the "Go" button behaviour

The Particle Source engine's `index.js` (module 53, function `u`) handles the Go click by loading an iframe. We need to **intercept** this to show the instruction guide instead. Add this script **after** `particle-landing.js`:

```html
<script>
(function() {
    // ── STATE B: Show instruction guide on Go click ──
    var goBtn = document.querySelector('#landing-root .go-btn');
    var guide = document.getElementById('landing-guide');
    var enterBtn = document.getElementById('enter-portal-btn');
    var landingRoot = document.getElementById('landing-root');

    if (goBtn) {
        // Remove the original Go handler (it tries to open an iframe)
        var newGo = goBtn.cloneNode(true);
        goBtn.parentNode.replaceChild(newGo, goBtn);

        newGo.addEventListener('click', function() {
            // Hide the menu UI
            var menu = document.querySelector('#landing-root .menu');
            if (menu) TweenMax.to(menu, 0.6, { opacity: 0, y: -30, ease: 'easeInQuint', onComplete: function() { menu.style.display = 'none'; } });

            // Show the guide
            guide.style.display = 'block';
            TweenMax.fromTo(guide, 0.8, { opacity: 0 }, { opacity: 1, ease: 'easeInOutCubic' });
        });
    }

    // ── ENTER PORTAL: Dismiss landing, reveal main app ──
    if (enterBtn) {
        enterBtn.addEventListener('click', function() {
            // Fade out entire landing
            TweenMax.to(landingRoot, 0.8, {
                opacity: 0,
                ease: 'easeInCubic',
                onComplete: function() {
                    landingRoot.style.display = 'none';
                    // Destroy the landing WebGL context to free GPU memory
                    var landingCanvas = landingRoot.querySelector('canvas');
                    if (landingCanvas) {
                        var gl = landingCanvas.getContext('webgl') || landingCanvas.getContext('experimental-webgl');
                        if (gl && gl.getExtension) gl.getExtension('WEBGL_lose_context')?.loseContext();
                    }
                }
            });
        });
    }
})();
</script>
```

---

## 4. Instruction Guide Styles

Add to `_portal_nifty.css` (or a new `landing-guide.css`):

```css
/* ── Instruction Guide (State B) ── */
#landing-guide {
    position: absolute;
    inset: 0;
    z-index: 100;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

.guide-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 5, 8, 0.82);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.guide-content {
    position: relative;
    z-index: 1;
    max-width: 680px;
    margin: 0 auto;
    padding: 80px 24px 120px;
    color: #e0e0e0;
    font-family: 'Playfair Display', serif;
}

.guide-title {
    font-size: clamp(28px, 5vw, 42px);
    font-weight: 400;
    font-style: italic;
    color: #fff;
    text-align: center;
    margin-bottom: 36px;
    letter-spacing: 0.02em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.guide-prose {
    font-size: clamp(15px, 2.5vw, 18px);
    line-height: 1.75;
    margin-bottom: 20px;
    font-style: italic;
    opacity: 0.92;
}

.guide-quote {
    margin: 40px 0;
    padding: 20px 24px;
    border-left: 3px solid rgba(0, 168, 255, 0.6);
    font-style: italic;
    font-size: clamp(16px, 2.6vw, 20px);
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.88);
}

.guide-quote cite {
    display: block;
    margin-top: 12px;
    font-size: 0.82em;
    font-style: normal;
    opacity: 0.7;
    letter-spacing: 0.04em;
}

.guide-instructions {
    margin-top: 48px;
}

.guide-instructions h2 {
    font-size: 22px;
    font-weight: 400;
    font-style: italic;
    color: #fff;
    margin-bottom: 28px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: 'Playfair Display', serif;
}

.guide-step {
    display: flex;
    gap: 16px;
    margin-bottom: 28px;
    align-items: flex-start;
}

.guide-step-badge {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(0, 168, 255, 0.5);
    border-radius: 2px;
    font-size: 13px;
    font-style: normal;
    color: rgba(0, 168, 255, 0.9);
    letter-spacing: 0.06em;
    transform: rotate(0deg); /* Can rotate 45deg to match diamond motif */
}

.guide-step strong {
    display: block;
    font-size: 16px;
    font-weight: 400;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
}

.guide-step p {
    font-size: 15px;
    line-height: 1.65;
    opacity: 0.85;
    margin: 0;
}

.guide-enter-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 56px;
    gap: 16px;
}

.guide-enter-hint {
    font-size: 15px;
    font-style: italic;
    opacity: 0.6;
    letter-spacing: 0.04em;
}
```

---

## 5. Key Implementation Notes

### 5.1 Particle Engine Scoping
The Particle Source `index.js` grabs `document.querySelector('canvas')` and `document.querySelector('.ui')` etc. on init. Since these elements are inside `#landing-root` and appear **first** in DOM order, the engine will naturally bind to the landing canvas. The portal's own canvas (inside `#portal-container`) loads later and won't conflict.

### 5.2 Three.js Version Conflict
The Particle Source uses **Three.js r76** (assigned to `window.THREE`). The Cymatics Portal engine likely uses a different Three.js version. **Load the landing scripts first**, then before the portal scripts, reassign:

```html
<script>
    // Preserve landing Three.js ref, then let portal load its own
    window.__landingTHREE = window.THREE;
    window.THREE = undefined;
</script>
<!-- Portal scripts load here and set their own window.THREE -->
```

If the portal also uses a global `THREE`, this prevents version collision.

### 5.3 TweenMax / GSAP Conflict
The portal may already use GSAP. TweenMax from the Particle Source is GSAP v1. If the portal uses GSAP v3+, load the landing's TweenMax first and namespace it:

```html
<script src="./landing/js/TweenMax.min.js"></script>
<script>window.__landingTweenMax = window.TweenMax;</script>
```

Then in the Go-override script, use `__landingTweenMax` instead of `TweenMax`.

### 5.4 Quality Selector Behaviour
The quality selector (Low/Medium/High) in the Particle Source controls particle count and motion blur quality. In the landing context, it **only affects the landing particle background** (visual fidelity of the attract screen). It does **not** carry over to the Cymatics Portal's particle count (which defaults to 111,111 per the earlier change).

### 5.5 `window.demoList` — Single Entry
The original Particle Source has 11 demos in `demoList`. For the landing, set this to a **single entry** (Cymatics) so the arrows and visual selector are simplified. Alternatively, keep multiple entries if you want users to preview different particle colour schemes before entering the portal.

### 5.6 iframe Navigation — Disabled
The original engine opens an iframe when Go is clicked (module 53, function `x`). The Go-override script in §3.E replaces this with the guide reveal. The `.iframe-container` div is kept for engine compatibility but will never load content.

### 5.7 Asset Path
The particle engine reads `assetPath` from config (module 40, default `'./'`). Since the motion_blur.png is at `./landing/images/motion_blur.png`, override before the engine initialises:

```html
<script>
    // Set asset path for landing particle engine
    window.__pmAssetPath = './landing/';
</script>
```

Then in `particle-landing.js`, find where `n.assetPath` is set (module 40) and replace `"./"` with `(window.__pmAssetPath || './')`.

### 5.8 Memory Cleanup
When "Enter Portal" is clicked, the landing's WebGL context is destroyed (see §3.E). This frees the GPU for the cymatics engine. The landing DOM is hidden but not removed (allows a future "back to landing" feature if desired).

---

## 6. Build & Test Checklist

- [ ] Copy Particle Source files into `CymaticsPortal/landing/` per §3.1
- [ ] Scope `landing.css` selectors under `#landing-root` per §3.2.B
- [ ] Add landing HTML to `_build_portal.py` shell template per §3.2.C
- [ ] Add script tags per §3.2.D and §3.2.E
- [ ] Handle Three.js version conflict per §5.2
- [ ] Handle TweenMax/GSAP conflict per §5.3
- [ ] Override `assetPath` per §5.7
- [ ] Run `python _build_portal.py` and verify `index.html` output
- [ ] Test: Page loads → particles animate → quality selector works
- [ ] Test: Go click → guide fades in over dimmed particles
- [ ] Test: "Enter" click → landing fades out → portal app visible and functional
- [ ] Test: Audio works in portal after landing dismissal
- [ ] Test: No console errors from Three.js version clash
- [ ] Test: Mobile responsive (quality buttons, guide scroll, Enter button)

---

## 7. Optional Enhancements

1. **Colour scheme sync:** Pass the landing's active `demoList` colour palette to the portal as initial hue values.
2. **Skip landing:** Add `#skip-landing` hash support to bypass the landing for returning users.
3. **Ambient audio:** Add a subtle low-frequency drone on the landing (requires user gesture) that crossfades into the portal's audio engine.
4. **Animated guide entry:** Stagger-animate each `.guide-step` on guide reveal using TweenMax `staggerFromTo`.
