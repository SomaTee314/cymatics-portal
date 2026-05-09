# Elemental Yin Yang — Fire & Water Upgrade

**Drop-in replacement** for `experiments/yin-yang-elements/index.html` (or wherever you mount this on the Cymatics Portal landing).

This single file kills the image dependency, fixes the modern-Three.js compile errors, and re-skins the particle field to read like the fire/water reference (Screenshot 144812) instead of the muted version (Screenshot 165551).

**File location (target repo):**
`experiments/yin-yang-elements/index.html` — full overwrite.

**Other files touched:** none. Pure single-file swap.

---

## 1. Diagnosis — what was wrong

| # | Issue | Symptom in Cursor / browser |
|---|---|---|
| 1 | `geom.addAttribute(...)` | `TypeError: geom.addAttribute is not a function` on Three r123+ (renamed to `setAttribute`) |
| 2 | `THREE.VertexColors` constant | `undefined` on Three r125+; particles render solid white or as default material color |
| 3 | Hardcoded path `../../js/particle-love.com/js/three.r76.min.js` | 404 in any project that isn't the original Particle Love repo |
| 4 | Hardcoded image path `../../images/yin-yang-elements.png` | 404 → silent fallback to a low-contrast `"Yin Yang"` text raster, which is exactly why 165551 looks dim and grey |
| 5 | Color comes from `boost = 0.12 + L*0.78 + e*0.14` over a desaturated source bitmap | Final colors stay washed-out no matter how high you push the boost |
| 6 | Single-pass `PointsMaterial`, no sprite map, square pixels | No glow, no smoke/flame texture, no bloom feel |
| 7 | Default 14k particles | Sparse on a full-bleed landing canvas — black gaps dominate |
| 8 | dat.GUI panel + reactive-audio script tags | Hard fail in Cursor build if those external files aren't ported over |

## 2. Plan — what changes and why

| Change | Why | Maps to target image |
|---|---|---|
| Generate yin-yang procedurally via SDF (outer disc, two bulbs, two dots) | Eliminates image fetch, image cache, image CORS | Always produces the canonical shape regardless of asset state |
| Classify every sample as `COOL` or `WARM` from geometry, not pixel hue | Dim source can't drive vivid output | Locks in saturated blue / saturated orange |
| Three-stop palette per side (`deep → mid → hot`) ramped by edge proximity | Reference image shows deep interior + bright rim per half | Ice-white rim on cool side, gold-yellow rim on warm side |
| Two `THREE.Points` passes — sharp FG + large soft halo, both additive | Single-pass additive can't fake bloom | Smoke/flame glow halo around the form |
| Soft radial sprite generated in-canvas, used as `map` on both passes | Default points are square; sprite gives round glowing dots | Smoke/fire wisp texture |
| Halo pass position lags FG by ~18%/frame | Cheap motion-trail/streak | Flame tail feel when mouse pushes |
| Asymmetric curl multiplier (warm × 1.45, cool × 0.85) | Fire flickers more than water | Reference shows turbulent flame vs smooth smoke |
| Density ramps by edge proximity + low-freq noise | Reference rim is denser than interior; noise gives wisp clumping | Wispy clump structure |
| Default 22000 particles (was 14000) | Fills the form on full-bleed | Solid coverage |
| Slow group rotation (0.025 rad/s) | Mandala feel, prevents static reading | Subtle life |
| Strip dat.GUI + reactive-audio | Cursor port had nothing to point those `<script>` tags at | Zero external runtime deps beyond Three |
| Modern Three APIs (`setAttribute`, `vertexColors: true`) | r123+ compatibility | Builds clean in Cursor / Vite / Next |

All mouse / wheel / parallax behavior from the original is **preserved verbatim** — same constants, same physics, same feel.

## 3. Quick start

1. Replace the contents of `experiments/yin-yang-elements/index.html` with the file in §5 below.
2. Confirm the Three CDN URL on the `<script src="...">` line resolves in your environment, or swap for your local pinned build (any version ≥ r150 is fine).
3. Hit save in Cursor. No other files change.

URL hash override still works: `index.html#particles=30000` to crank density, `#particles=8000` to lighten it.

## 4. Pass / fail checklist

After the swap, walk these:

- [ ] Console is clean (no `addAttribute`, no `VertexColors`, no 404)
- [ ] Page background is near-black, no white flash on load
- [ ] Yin-yang shape is unmistakably present within ~1s of load
- [ ] Cool half reads as **vivid blue → cyan-white at the rim**, not grey
- [ ] Warm half reads as **deep red → orange → gold-yellow at the rim**, not brown
- [ ] Both inverted dots (warm dot in cool head, cool dot in warm head) are visible
- [ ] Mouse drag pushes particles outward, then they spring back
- [ ] Mouse motion creates a faint stretchy trail (the halo lag)
- [ ] Wheel zoom feels identical to the original
- [ ] Whole cloud rotates very slowly (~one full turn every ~4 minutes)
- [ ] No noticeable framerate drop on a mid-tier laptop at 22k particles

If any of these fail, the tuning knobs in §6 cover the fix.

---

## 5. Implementation — full replacement file (verbatim)

Save as `experiments/yin-yang-elements/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Elemental Yin Yang — Fire & Water</title>
  <style>
    html, body {
      margin: 0;
      height: 100%;
      overflow: hidden;
      background: #02030a;
      font-family: Georgia, 'Times New Roman', serif;
    }
    canvas {
      display: block;
      position: fixed;
      left: 0;
      top: 0;
      width: 100% !important;
      height: 100% !important;
      z-index: 1;
    }
    .vignette {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2;
      background: radial-gradient(ellipse at center, transparent 35%, rgba(2, 3, 10, 0.78) 100%);
    }
    #hint {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 18px;
      text-align: center;
      color: rgba(255, 255, 255, 0.32);
      font-size: 12px;
      letter-spacing: 0.05em;
      pointer-events: none;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      z-index: 3;
    }
  </style>
  <!-- Modern Three.js. Pin to whatever version your project uses; r150+ all work. -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js"></script>
</head>
<body>
  <div class="vignette"></div>
  <div id="hint">move pointer · scroll to zoom</div>
  <script>
  (function () {
    'use strict';

    // ============================================================
    // CONFIG — every knob lives here
    // ============================================================
    function particleGoal() {
      var m = window.location.hash.match(/particles=(\d+)/i);
      var n = m ? parseInt(m[1], 10) : 22000;
      return Math.min(60000, Math.max(6000, n));
    }

    var RADIUS         = 0.62;     // outer yin-yang radius in world units
    var POINT_SIZE_FG  = 0.011;    // foreground bright particles
    var POINT_SIZE_HALO = 0.040;   // background bloom halo
    var FG_OPACITY     = 0.95;
    var HALO_OPACITY   = 0.18;
    var HALO_LAG       = 0.18;     // 0..1, how fast halo follows FG (higher = tighter)

    // Palettes (linear-ish RGB, 0..1). 3 stops per side: deep -> mid -> hot.
    var COOL_DEEP = [0.04, 0.08, 0.42]; // navy
    var COOL_MID  = [0.18, 0.48, 1.00]; // cobalt
    var COOL_HOT  = [0.78, 0.94, 1.00]; // ice-white
    var WARM_DEEP = [0.42, 0.06, 0.04]; // crimson
    var WARM_MID  = [1.00, 0.36, 0.08]; // orange
    var WARM_HOT  = [1.00, 0.86, 0.48]; // gold-yellow

    // Motion (matches the original feel; tune carefully)
    var MASTER         = 1.20;
    var POINTER_SHARP  = 26;
    var REPEL          = 4.6;
    var SWIRL          = 3.0;
    var PUSH_RADIUS    = 0.50;
    var SPRING         = 6.0;
    var DAMPING        = 0.965;
    var CURL           = 0.045;
    var FLOW           = 1.10;
    var DEPTH_W        = 0.018;
    var PARALLAX       = 0.060;
    var ZOOM_SENS      = 0.00055;
    var ROTATION_SPEED = 0.025;     // rad / s, full-cloud spin
    var WARM_FLICKER   = 1.45;      // curl multiplier on warm side
    var COOL_DRIFT     = 0.85;      // curl multiplier on cool side

    // ============================================================
    // SCENE
    // ============================================================
    var scene = new THREE.Scene();

    var camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    camera.position.z = 2.35;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x02030a, 1);
    document.body.insertBefore(renderer.domElement, document.body.firstChild);

    // ============================================================
    // SOFT-DISC SPRITE (radial gradient → round, glowing points)
    // ============================================================
    function makeSoftDisc() {
      var s = 64;
      var c = document.createElement('canvas');
      c.width = c.height = s;
      var g = c.getContext('2d');
      var grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0.00, 'rgba(255,255,255,1.00)');
      grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      grd.addColorStop(0.55, 'rgba(255,255,255,0.18)');
      grd.addColorStop(1.00, 'rgba(255,255,255,0.00)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
      var tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }
    var softDisc = makeSoftDisc();

    // ============================================================
    // INPUT
    // ============================================================
    var mouse     = new THREE.Vector2(0, 0);
    var mouseSm   = new THREE.Vector2(0, 0);
    var _unproj   = new THREE.Vector3();
    var _dir      = new THREE.Vector3();
    var mouseWorld = new THREE.Vector3(0, 0, 0);
    var scrollZoom = 0;

    function onPointer(e) {
      mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('wheel', function (e) {
      scrollZoom += e.deltaY * ZOOM_SENS;
      scrollZoom = Math.max(-0.9, Math.min(1.2, scrollZoom));
    }, { passive: true });

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, true);
    }
    window.addEventListener('resize', resize);
    resize();

    function updateMouseWorld(ndcX, ndcY) {
      _unproj.set(ndcX, ndcY, 0.5).unproject(camera);
      _dir.copy(_unproj).sub(camera.position).normalize();
      var t = -camera.position.z / _dir.z;
      if (t > 0 && isFinite(t)) {
        mouseWorld.copy(camera.position).addScaledVector(_dir, t);
      } else {
        mouseWorld.set(ndcX * 1.85, ndcY * 1.85, 0);
      }
    }

    // ============================================================
    // YIN-YANG SDF — classify every sample point
    // ============================================================
    // Outer disc radius R. Two bulbs of radius R/2 centered at (0,+R/2) and (0,-R/2).
    // Two dots of radius R/8 at the same centers (inverted color of their bulb).
    // Returns { side: 'COOL'|'WARM', dEdge: distance-to-nearest-form-edge, kind } or null if outside.
    function classify(x, y) {
      var R = RADIUS;
      var rOuter = Math.sqrt(x * x + y * y);
      if (rOuter > R) return null;

      var dxUp = x,        dyUp = y - R / 2;
      var dxLo = x,        dyLo = y + R / 2;
      var dUp  = Math.sqrt(dxUp * dxUp + dyUp * dyUp);
      var dLo  = Math.sqrt(dxLo * dxLo + dyLo * dyLo);
      var dotR = R / 8;

      var dEdgeOuter = R - rOuter;
      var dEdgeUp    = Math.abs(dUp - R / 2);
      var dEdgeLo    = Math.abs(dLo - R / 2);
      var dEdge      = Math.min(dEdgeOuter, Math.min(dEdgeUp, dEdgeLo));

      // Inverted dots first
      if (dUp < dotR) {
        return { side: 'WARM', dEdge: Math.min(dEdge, dotR - dUp), kind: 'dot' };
      }
      if (dLo < dotR) {
        return { side: 'COOL', dEdge: Math.min(dEdge, dotR - dLo), kind: 'dot' };
      }
      // Bulbs
      if (dUp < R / 2) return { side: 'COOL', dEdge: dEdge, kind: 'bulb' };
      if (dLo < R / 2) return { side: 'WARM', dEdge: dEdge, kind: 'bulb' };
      // Outer crescents — split by x
      if (x < 0) return { side: 'COOL', dEdge: dEdge, kind: 'crescent' };
      return { side: 'WARM', dEdge: dEdge, kind: 'crescent' };
    }

    // Cheap pseudo-noise (no extra deps). Smooth, periodic-ish, good enough for clumping.
    function fbm(x, y) {
      return 0.5 + 0.5 * Math.sin(x * 3.7 + Math.cos(y * 2.9));
    }

    function lerp3(a, b, t) {
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
      ];
    }
    function paletteFor(side, t) {
      // t in 0..1, 0 = deep interior, 1 = hot rim
      var A = side === 'COOL' ? COOL_DEEP : WARM_DEEP;
      var B = side === 'COOL' ? COOL_MID  : WARM_MID;
      var C = side === 'COOL' ? COOL_HOT  : WARM_HOT;
      if (t < 0.5) return lerp3(A, B, t * 2);
      return lerp3(B, C, (t - 0.5) * 2);
    }

    // ============================================================
    // PARTICLE BUILD — rejection sampling inside the SDF
    // ============================================================
    function buildParticles() {
      var goal = particleGoal();
      var positions = [];
      var colors    = [];
      var tries = 0;
      var maxTries = goal * 80;

      while (positions.length / 3 < goal && tries < maxTries) {
        tries++;
        var x = (Math.random() - 0.5) * 2 * RADIUS * 1.05;
        var y = (Math.random() - 0.5) * 2 * RADIUS * 1.05;
        var c = classify(x, y);
        if (!c) continue;

        // Density: denser near edges (rim + S-curve), modulated by low-freq noise for clumping.
        var edgeNorm = Math.min(1, c.dEdge / (RADIUS * 0.45));     // 1 = deep interior, 0 = right at edge
        var edgeWeight = Math.pow(1 - edgeNorm, 0.45) * 0.65 + 0.35;
        var noiseMod = 0.55 + 0.45 * fbm(x * 4.0, y * 4.0);
        var keep = edgeWeight * noiseMod;
        if (Math.random() > keep) continue;

        // Z scatter — warm side flickers deeper (fire), cool side stays flatter (water).
        var zJit = (c.side === 'WARM')
          ? (Math.random() - 0.5) * 0.05
          : (Math.random() - 0.5) * 0.025;
        var jx = (Math.random() - 0.5) * 0.005;
        var jy = (Math.random() - 0.5) * 0.005;
        positions.push(x + jx, y + jy, zJit);

        // Color ramp 0..1: bright at any edge (rim or S-curve), deep in interior, plus a noise bump.
        var nearEdge = 1 - edgeNorm; // 0..1, 1 = at edge
        var t_color  = Math.max(0, Math.min(1,
          0.20
          + 0.85 * Math.pow(nearEdge, 1.4)
          + 0.18 * fbm(x * 7.0, y * 7.0)
        ));
        var col = paletteFor(c.side, t_color);
        colors.push(col[0], col[1], col[2]);
      }

      var basePos = new Float32Array(positions);
      var vel     = new Float32Array(positions.length);

      // Foreground
      var geomFg = new THREE.BufferGeometry();
      geomFg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geomFg.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(colors), 3));

      // Halo (fresh position copy; lags FG each frame)
      var geomHalo = new THREE.BufferGeometry();
      geomHalo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geomHalo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(colors), 3));

      var matFg = new THREE.PointsMaterial({
        size: POINT_SIZE_FG,
        map: softDisc,
        vertexColors: true,
        transparent: true,
        opacity: FG_OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        alphaTest: 0.001
      });
      var matHalo = new THREE.PointsMaterial({
        size: POINT_SIZE_HALO,
        map: softDisc,
        vertexColors: true,
        transparent: true,
        opacity: HALO_OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        alphaTest: 0.001
      });

      var pointsFg   = new THREE.Points(geomFg,   matFg);
      var pointsHalo = new THREE.Points(geomHalo, matHalo);
      var group = new THREE.Group();
      group.add(pointsHalo); // halo behind
      group.add(pointsFg);
      scene.add(group);

      return { group: group, geomFg: geomFg, geomHalo: geomHalo, basePos: basePos, vel: vel };
    }

    var sys = buildParticles();

    // ============================================================
    // ANIMATION
    // ============================================================
    function curl2(px, py, time) {
      var s = 2.1;
      return {
        x: Math.sin(py * s + time * 0.9) * Math.cos(px * s * 0.7 - time * 0.45),
        y: Math.sin(px * s - time * 0.7) * Math.cos(py * 0.8 * s + time * 0.35)
      };
    }

    var clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      var dt = Math.min(clock.getDelta(), 0.08);
      var t = clock.getElapsedTime() * FLOW;

      // Pointer smoothing
      var ease = 1 - Math.exp(-POINTER_SHARP * dt);
      mouseSm.x += (mouse.x - mouseSm.x) * ease;
      mouseSm.y += (mouse.y - mouseSm.y) * ease;
      updateMouseWorld(mouseSm.x, mouseSm.y);

      // Camera (zoom + parallax)
      var zTarget = 2.35 - scrollZoom * 0.85;
      camera.position.z += (zTarget - camera.position.z) * (0.08 + dt * 4);
      camera.position.x = mouseSm.x * PARALLAX;
      camera.position.y = mouseSm.y * PARALLAX * 0.92;
      camera.lookAt(scene.position);

      // Slow whole-cloud rotation
      sys.group.rotation.z += dt * ROTATION_SPEED;

      // Physics over FG buffer; halo lerps after.
      var arr     = sys.geomFg.attributes.position.array;
      var haloArr = sys.geomHalo.attributes.position.array;
      var basePos = sys.basePos;
      var vel     = sys.vel;

      var mx = mouseWorld.x, my = mouseWorld.y;
      var mi = MASTER;
      var pushRadiusSq = PUSH_RADIUS * PUSH_RADIUS;
      var repel = REPEL * mi;
      var swirl = SWIRL * mi;
      var damp  = Math.pow(DAMPING, dt * 60);

      for (var i = 0; i < arr.length; i += 3) {
        var bx = basePos[i],     by = basePos[i + 1], bz = basePos[i + 2];
        var px = arr[i],         py = arr[i + 1],     pz = arr[i + 2];
        var dxm = px - mx,       dym = py - my;
        var distSq = dxm * dxm + dym * dym + 0.00008;

        var fx = 0, fy = 0, fz = 0;

        if (distSq < pushRadiusSq) {
          var inv = 1 / distSq;
          var falloff = (pushRadiusSq - distSq) / pushRadiusSq;
          var push = repel * falloff * falloff * inv * 0.085;
          fx += dxm * push;
          fy += dym * push;
          var invLen = 1 / Math.sqrt(distSq);
          fx += (-dym * invLen) * swirl * falloff * 0.14;
          fy += ( dxm * invLen) * swirl * falloff * 0.14;
        }

        // Curl noise — asymmetric per side
        var c = curl2(bx * 3.2, by * 3.2, t);
        var sideMul = (bx > 0) ? WARM_FLICKER : COOL_DRIFT;
        var curlAmt = CURL * mi * sideMul;
        fx += c.x * curlAmt;
        fy += c.y * curlAmt;

        // Spring back to rest, with a wobble in z
        fx += (bx - px) * SPRING;
        fy += (by - py) * SPRING;
        fz += (bz + DEPTH_W * Math.sin(t * 1.8 + bx * 5 + by * 3) - pz) * (SPRING * 0.68);

        vel[i]     = (vel[i]     + fx * dt) * damp;
        vel[i + 1] = (vel[i + 1] + fy * dt) * damp;
        vel[i + 2] = (vel[i + 2] + fz * dt) * damp;

        arr[i]     += vel[i];
        arr[i + 1] += vel[i + 1];
        arr[i + 2] += vel[i + 2];

        // Halo lerps toward FG — cheap streak / glow trail
        haloArr[i]     += (arr[i]     - haloArr[i])     * HALO_LAG;
        haloArr[i + 1] += (arr[i + 1] - haloArr[i + 1]) * HALO_LAG;
        haloArr[i + 2] += (arr[i + 2] - haloArr[i + 2]) * HALO_LAG;
      }
      sys.geomFg.attributes.position.needsUpdate = true;
      sys.geomHalo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();
  })();
  </script>
</body>
</html>
```

---

## 6. Tuning knobs cheat sheet

All knobs live at the top of the IIFE under `// CONFIG`. Common adjustments:

| You want… | Change | From → suggested |
|---|---|---|
| Brighter rim, darker interior | `COOL_HOT`, `WARM_HOT` more saturated; or raise `0.85 * Math.pow(nearEdge, 1.4)` exponent down to `1.1` | sharper edge gradient |
| More smoke/wisp, less hard form | `HALO_OPACITY 0.18 → 0.30`, `POINT_SIZE_HALO 0.040 → 0.055` | thicker bloom |
| More fire flicker on warm side | `WARM_FLICKER 1.45 → 1.9`, `CURL 0.045 → 0.06` | turbulent right half |
| Calmer water on cool side | `COOL_DRIFT 0.85 → 0.55` | smoother left half |
| Form drifts/breaks too easily under cursor | `REPEL 4.6 → 3.0`, `SPRING 6.0 → 8.0` | snappier return |
| Tighter halo (less trail) | `HALO_LAG 0.18 → 0.40` | shorter streaks |
| Denser landing | URL hash: `#particles=32000` | more coverage, watch FPS |
| Lighter landing | URL hash: `#particles=12000` | airy, faster |
| Spin off | `ROTATION_SPEED 0.025 → 0` | static cloud |
| Tighter circle on screen | `RADIUS 0.62 → 0.50` | smaller form, more vignette |
| Different overall color identity | swap any of the 6 palette stops | full re-skin in 60 seconds |

## 7. If you're mounting this as a React/Next component instead

Same logic, mounted in a `useEffect`. Skeleton:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ElementalYinYang() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // === paste the entire IIFE body from §5 here, with two changes:
    //  1) replace `document.body.insertBefore(renderer.domElement, ...)`
    //     with `host.appendChild(renderer.domElement);`
    //  2) capture all addEventListener references and the requestAnimationFrame id
    //     so you can clean them up below.

    let rafId = 0;
    // ... same scene/camera/renderer/buildParticles/animate ...
    // animate() now does: rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      softDisc.dispose();
      // dispose geomFg, geomHalo, matFg, matHalo
      host.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ position: 'fixed', inset: 0, background: '#02030a', zIndex: 0 }}
    />
  );
}
```

For a Cymatics Portal landing, mount this as the page background layer, then put your hero copy in a sibling `<div style={{ position: 'relative', zIndex: 4 }}>` so it sits above the canvas + vignette.

---

## 8. What I deliberately did not change

- Mouse / wheel / parallax constants — identical to the original `ELEMENTAL_YIN_YANG_PORT.md` table. The new feel is purely visual; interaction physics is untouched.
- Camera FOV, near, far, initial z — identical.
- Damping / spring scalars — identical.
- The 0.085 push scaling and 0.14 swirl scaling — identical.

If you want to A/B against the original purely on look while keeping interaction parity, that's now possible with one file swap and back.
