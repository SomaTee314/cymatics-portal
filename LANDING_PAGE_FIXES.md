# Landing Page Fixes — Quality Gate & Close Button

> **Context:** The `LANDING_PAGE.md` spec was implemented in Cursor. Two issues surfaced:
> 1. The `.close-btn` was missing from the overlay HTML → null `addEventListener` → blank page (already fixed by Cursor)
> 2. The quality selector (Low/Medium/High) shows as an unwanted first screen before the particles + Go button appear
>
> **This document fixes issue #2** and provides a guard against regressions on #1.

---

## Issue: Unwanted Quality Selector Screen

### Root Cause

The Particle Source engine (`particle-landing.js`, module 53) is designed as a two-step flow:

1. **Quality gate** — user picks Low / Medium / High → sets particle texture resolution + motion blur quality
2. **Attract screen** — particles animate, Go button appears, user picks a demo and clicks Go → iframe loads

The quality selector markup (`.quality-selector`) **cannot be removed from the DOM** because the engine's `init` function (module 53, function `o`) queries `.quality-selector`, `.quality-btn`, and `.quality-title` and attaches click handlers. Removing the elements would cause null reference errors identical to the `.close-btn` crash.

### Solution: Auto-Select Quality on Load

The Chakra Yogi experiment in the Particle Source project already demonstrates this pattern — it programmatically clicks a quality button after a delay so the user never sees the gate.

**In `_build_portal.py`, in the landing bridge script block (after `particle-landing.js` loads), add this before the Go-override logic:**

```javascript
// ── AUTO-SKIP QUALITY GATE ──
// Programmatically click "Low" after the engine finishes init (attract performance).
// The engine's quality handler hides the selector and sets texture resolution.
(function() {
    var qualityBtns = document.querySelectorAll('#landing-root .quality-btn');
    if (qualityBtns.length >= 1) {
        setTimeout(function() {
            qualityBtns[0].click(); // Index 0 = "Low"
        }, 100);
    }
})();
```

**Additionally, hide the quality selector visually from the start** so users never see even a flash of it. Add to the landing CSS or inline in the overlay HTML:

```css
/* Hide the quality gate — auto-selected by script */
#landing-root .quality-selector {
    opacity: 0 !important;
    pointer-events: none !important;
}

#landing-root .quality-title {
    opacity: 0 !important;
}
```

This way:
- The DOM elements exist (engine doesn't crash)
- The engine's click handler fires (sets texture sizes, hides selector, starts attract animation)
- The user never sees the Low/Medium/High screen
- The particle attract screen with the Go button appears immediately

### Why "Low" (not Medium)?

**Low** is selected for the Cymatics Portal **attract screen** to reduce GPU load from the motion particle sim and post-process (smaller motion textures and lighter defaults than Medium/Medium’s ~65K-particle feel). The overlay is a short-lived background; the main portal cymatics experience after **Enter Portal** is independent.

Medium (index 1) was the earlier default and looks slightly richer but can feel laggy on laptops and phones inside a parent page or iframe. **Do not switch back to Medium without checking FPS** on representative hardware.

If you need a quality bump for a demo build, change **`qualityBtns[0]`** to **`qualityBtns[1]`** in the bridge script (`index.html` / `_build_portal.py`) and re-run the portal build.

**Reference (Medium, for comparison):**

- `particlesMotionTextureWidth/Height` ≈ 256 (on the order of tens of thousands of particles in the stock engine)
- Motion blur enabled at reduced scale

---

## Guard: Ensure All Required DOM Elements Exist

The Particle Source engine's module 53 `init` function (`o`) queries these selectors during startup. **All must exist in `landing/overlay.html`:**

| Selector | Element | Purpose |
|----------|---------|---------|
| `canvas` | `<canvas>` inside `.ui` | WebGL render target |
| `.ui` | Wrapper div | UI container |
| `.logo` | Logo block | Title display + click handler |
| `.quality-selector` | Quality gate wrapper | Quality selection (auto-clicked) |
| `.quality-title` | Title text | "Please choose the quality..." |
| `.quality-btn` (×3) | Three buttons | Low / Medium / High handlers |
| `.menu` | Menu wrapper | Contains Go + arrows + titles |
| `.go-btn` | Go button | Launch handler |
| `.go-btn-bg-spinner` | Spinner inner | Hover rotation effect |
| `.iframe-container` | Iframe host | Background colour target (no iframe loaded) |
| `.titles-container` | Title carousel wrapper | Demo title display |
| `.titles-move-container` | Scrolling title strip | Demo title animation |
| `.arrow` (×2) | Left/right arrows | Demo navigation |
| `.close-btn` | Close button | Back-from-iframe handler |
| `.close-btn-part` (×2) | X lines | Visual cross icon |

If any of these are missing, the engine will throw on `querySelector(...).addEventListener(...)` and halt all subsequent scripts — including the cymatics portal.

---

## Updated Bridge Script (Complete)

Replace the entire bridge `<script>` block in `_build_portal.py` with this consolidated version:

```javascript
(function() {
    var landingRoot = document.getElementById('landing-root');
    if (!landingRoot) return; // skip-landing or missing

    // ── 1. AUTO-SKIP QUALITY GATE ──
    /* Index 0 = Low — smaller motion texture; prioritises attract FPS (see LANDING_PAGE_FIXES.md). */
    var qualityBtns = landingRoot.querySelectorAll('.quality-btn');
    if (qualityBtns.length >= 1) {
        setTimeout(function() {
            qualityBtns[0].click(); // Low
        }, 100);
    }

    // ── 2. OVERRIDE GO BUTTON → SHOW GUIDE ──
    var origGo = landingRoot.querySelector('.go-btn');
    var guide = document.getElementById('landing-guide');

    if (origGo && guide) {
        // Clone to strip the engine's iframe-launch handler
        var newGo = origGo.cloneNode(true);
        origGo.parentNode.replaceChild(newGo, origGo);

        newGo.addEventListener('click', function() {
            // Hide the menu (arrows + Go + titles)
            var menu = landingRoot.querySelector('.menu');
            if (menu) {
                TweenMax.to(menu, 0.6, {
                    opacity: 0,
                    y: -30,
                    ease: 'easeInQuint',
                    onComplete: function() { menu.style.display = 'none'; }
                });
            }

            // Hide the logo
            var logo = landingRoot.querySelector('.logo');
            if (logo) {
                TweenMax.to(logo, 0.5, { opacity: 0 });
            }

            // Reveal the instruction guide
            guide.style.display = 'block';
            TweenMax.fromTo(guide, 0.8,
                { opacity: 0 },
                { opacity: 1, ease: 'easeInOutCubic' }
            );
        });
    }

    // ── 3. ENTER PORTAL → DISMISS LANDING ──
    var enterBtn = document.getElementById('enter-portal-btn');
    if (enterBtn) {
        enterBtn.addEventListener('click', function() {
            TweenMax.to(landingRoot, 0.8, {
                opacity: 0,
                ease: 'easeInCubic',
                onComplete: function() {
                    landingRoot.style.display = 'none';

                    // Remove the behind-landing class so portal is interactive
                    var portalMain = document.querySelector('.portal-main');
                    if (portalMain) {
                        portalMain.classList.remove('portal-main--behind-landing');
                    }

                    // Trigger resize so the cymatics canvas sizes correctly
                    window.dispatchEvent(new Event('resize'));

                    // Destroy landing WebGL context to free GPU
                    var landingCanvas = landingRoot.querySelector('canvas');
                    if (landingCanvas) {
                        var gl = landingCanvas.getContext('webgl')
                              || landingCanvas.getContext('experimental-webgl');
                        if (gl) {
                            var ext = gl.getExtension('WEBGL_lose_context');
                            if (ext) ext.loseContext();
                        }
                    }
                }
            });
        });
    }
})();
```

---

## Cursor Prompt

Copy this into Cursor (Agent mode) to apply the fix:

```
Apply the fixes from LANDING_PAGE_FIXES.md:

1. In _build_portal.py, hide the quality selector with CSS (opacity: 0, pointer-events: none) 
   on #landing-root .quality-selector and #landing-root .quality-title

2. In the landing bridge script, auto-click the **Low** quality button
   (`qualityBtns[0].click()` after 100ms `setTimeout`) BEFORE the Go-button override

3. Replace the entire bridge script block with the consolidated version from the fixes doc

4. Run python _build_portal.py and verify the build succeeds

Do NOT remove .quality-selector or .quality-btn elements from the HTML — they must 
exist in the DOM for the particle engine to initialise without errors.
```
