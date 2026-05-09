# Neon Yin Yang (mask sampler) — full port specification

**Shipped demo (this repo):** `experiments/yin-yang-neon-mask/index.html`  

**Companion art:** `images/fire-ice-yin-yang-neon.png`  

Use this document to re-create the behaviour and look **exactly** in another stack (still WebGL points + additive blend + same maths) or when auditing parity.

---

## 1. Intended look

| Aspect | Specification |
|--------|----------------|
| **Theme** | Fire & ice Yin Yang raster → particles; neon cyan/blue vs orange/red glow on **true black**. |
| **Background** | HTML/CSS `#000`; WebGL `setClearColor(0x000000, 1)`. |
| **Fog** | `THREE.FogExp2(color: 0x000000, density: from UI, default **0.032**)` |
| **Points** | `vertexColors`, `transparent: true`, `opacity` default **0.97**, **`AdditiveBlending`**, **`depthWrite: false`**, **`sizeAttenuation: true`**. |
| **Ambient light** | `THREE.AmbientLight(0x1a4080, 0.22)` — very subtle blue fill; neon comes from sampled vertex colours + additive stack. |

---

## 2. Dependencies (paths as in Particle Madness repo)

| Resource | Purpose |
|---------|---------|
| `../../js/particle-love.com/js/three.r76.min.js` | **three.js r76** (`BufferGeometry`, `addAttribute`, `THREE.VertexColors` on material, etc.). |
| `https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js` | Control panel. |
| `../../js/dat-gui-panel.js` | `attachMovableDatGui(...)` optional; harmless if absent. |
| `../../js/pm-reactive-audio-panel.js` | Optional **`window.__pmReactiveAudio.getDrive(t)`**; if missing, drive factors are **`{ intensity: 1, curl: 1, flow: 1 }`**. |
| **`../../images/fire-ice-yin-yang-neon.png`** | Source bitmap for silhouette + palette. |

---

## 3. Hash: particle budget

Parse `window.location.hash` with regex **`/particles=(\d+)/i`**.

| Rule | Value |
|------|--------|
| Default (no match) | **14000** |
| Clamp | **`max(4000, min(48000, n))`** |

Auto **initial point size** (before user moves sliders) when building geometry:

| `goal` | `controls.pointSize` |
|--------|----------------------|
| `> 22000` | **0.0078** |
| `> 12000` | **0.0088** |
| else | **0.01** |

---

## 4. Rasterisation for sampling

1. Offscreen **`canvas`** 2D context.
2. **Width** fixed **`w = 340`** px (not 320 like Golden Mask).
3. **Height** `h = max(32, round(img.height * (w / img.width)))` when `img` loads; **`h = 400`** on fallback drawable.
4. **`drawImage(img, 0, 0, w, h)`** when image exists.

### 4.1 Fallback when texture load fails (`buildParticles(null)`) — or `mask-draw.js` / `scripts/export-neon-mask-png.mjs`

Shared implementation: [`mask-draw.js`](./mask-draw.js) exports **`drawNeonMaskRaster(ctx, w, h)`** (also assigned on `window` for `index.html`). Companion bitmap [`../images/fire-ice-yin-yang-neon.png`](../images/fire-ice-yin-yang-neon.png) is generated for parity with **`node scripts/export-neon-mask-png.mjs`** (Puppeteer + same draw routine).

Programmatic mask on black:

| Step | Action |
|------|--------|
| Fill | `#000` full rect. |
| Yin base | **Full circle** radius **`min(w,h)×0.38`**, centre **`(w/2, h/2)`**, solid **`#00b4ff`**. |
| Yang lobe | Closed path (3 arcs): from north, **clockwise** big arc along **east** from **`−π/2` → `π/2`**, then small arc centred **`(cx, cy+R/2)`** radius **`R/2`** (CCW **`π/2` → `3π/2`**), then small arc centred **`(cx, cy−R/2)`** (CW **`π/2` → `−π/2`**); fill **`#ff6600`**. |
| Eyes | **Pupil voids:** disks **`#050508`** radius **`≈0.024×min(w,h)`** (half of reference eye radius), centres **`(cx, cy−R/2)`** and **`(cx, cy+R/2)`** — upper in ice bulb, lower in fire bulb. |
| Om void | **`destination-out`** ellipse **`rx≈0.048×min`**, **`ry≈0.12×min`**; **`source-over`**. |

Then **`getImageData(0, 0, w, h)`** as usual.

**Note:** The companion **`fire-ice-yin-yang-neon.png`** is produced by **`node scripts/export-neon-mask-png.mjs`** (same geometry). Earlier horizontal-gradient-disk masks are obsolete.

### 4.2 Luminance

Per pixel `(ix, iy)` index `i = (iy * w + ix) * 4`:

```
L = (0.299 * R + 0.587 * G + 0.114 * B) / 255    // ∈ [0, 1]
```

### 4.3 Rejection sampling loop

Maintain arrays `pos` (triplets) and `col` (RGB triplets).  
**`goal`** = clamped particle count. **`maxTries = goal * 100`**.

Each try:

1. **`ix = floor(rand() * w)`**, **`iy = floor(rand() * h)`**.
2. Compute **`L = lumAt(ix, iy)`**.
3. **Reject** if **`L < 0.05 + random() * 0.32`** (keeps blacks empty; stochastic edge softness).

Accepted sample:

**World placement** — aspect **`aspectImg = w / h`**:

```
spanX = aspectImg * 1.18
spanY = 1.18
nx = (ix / w - 0.5) * spanX
ny = -(iy / h - 0.5) * spanY
j = 0.0045 * (1 - L)
```

Push position:

```
(nx + (rand()-0.5)*j,
 ny + (rand()-0.5)*j,
 (rand()-0.5) * 0.028)
```

**Colour**: read **`r,g,b`** from byte data `÷ 255`; apply **`neonTint(r, g, b, L)`** (§5); append RGB to `col`.

---

## 5. `neonTint(r, g, b, L)` — exact branching

Inputs `r,g,b,L` typically in **`[0,1]`**.

```
boost = 0.08 + L * 0.92
cool  = (b > r * 1.02)
warm  = (r > b * 1.02)
rr = r * boost
gg = g * boost
bb = b * boost
```

- **If `cool`:**  
  `bb = min(1, bb * 1.14 + L * 0.08)`  
  `gg = min(1, gg * 1.06 + L * 0.02)`  
  `rr *= 0.92`

- **Else if `warm`:**  
  `rr = min(1, rr * 1.12 + L * 0.07)`  
  `gg = min(1, gg * 1.05 + L * 0.02)`  
  `bb *= 0.9`

- **Else:**  
  `rr = min(1, rr + L * 0.03)`  
  `gg = min(1, gg + L * 0.03)`  
  `bb = min(1, bb + L * 0.03)`

Return **`[min(1,rr), min(1,gg), min(1,bb)]`** (final min per channel after branches).

---

## 6. Geometry and material

- **`basePos`** = `Float32Array` copy of initial `pos`.
- **`vel`** = `Float32Array` same length, zeros.
- **`BufferGeometry`**: attributes **`position`**, **`color`** (both `Float32Array`).
- **`PointsMaterial`**:
  - `size`: from controls (see defaults §7)
  - `vertexColors: THREE.VertexColors`
  - `transparent: true`
  - `opacity`: from controls
  - `blending: THREE.AdditiveBlending`
  - `depthWrite: false`
  - `sizeAttenuation: true`

Scene graph: **`Points`** + **`AmbientLight(0x1a4080, 0.22)`** + fog as above.

---

## 7. Default control object (numeric seeds)

Restore **`defaults`** resets to exactly:

| Field | Default |
|-------|---------|
| `masterIntensity` | **1.35** |
| `pointerSharpness` | **28** |
| `repel` | **4.2** |
| `swirl` | **2.4** |
| `radius` | **0.5** |
| `spring` | **5.8** |
| `velocityDamping` | **0.965** |
| `curlStrength` | **0.038** |
| `flowSpeed` | **1.15** |
| `depthWobble` | **0.014** |
| `cameraParallax` | **0.055** |
| `zoomSensitivity` | **0.00055** |
| `particleOpacity` | **0.97** |
| `fogDensity` | **0.032** |

`pointSize` on reset: recomputed from **`particleGoal()`** using the §3 table.

### dat.GUI folders and ranges

| Folder | Controls (object field → [min,max], optional label) |
|--------|-----------------------------------------------------|
| Master | `masterIntensity` [0.2, 3] “intensity”; `pointerSharpness` [4, 48] “pointer snap”; buttons `resetPhysics`, `defaults` |
| Push & swirl | `repel` [0.2, 12]; `swirl` [0, 8]; `radius` [0.15, 1.2] “influence radius” |
| Spring & damping | `spring` [0.5, 14]; `velocityDamping` [0.85, 0.995] “velocity keep” |
| Ambient flow | `curlStrength` [0, 0.12] “curl strength”; `flowSpeed` [0, 3]; `depthWobble` [0, 0.045] “depth ripple” |
| Camera | `cameraParallax` [0, 0.2] “parallax”; `zoomSensitivity` [0.0001, 0.002] “scroll zoom” |
| Particles | `pointSize` [0.003, 0.024] “point size”; `particleOpacity` [0.3, 1] “opacity”; `fogDensity` [0, 0.12] “fog” |

Panel title passed to movable wrapper: **`"Neon Yin Yang"`**.  
**Hotkey:** `H` toggles GUI visibility.

---

## 8. Renderer and camera

| Item | Value |
|------|--------|
| `PerspectiveCamera` | FOV **50**, near **0.01**, far **100**, initial **`position`** `(0, 0, 2.35)` |
| Pixel ratio | `min(devicePixelRatio, 2)` |

---

## 9. Pointer, wheel, parallax — exact formulae

**NDC pointer** (every `pointermove` / `pointerdown`):

```
mouse.x = (clientX / innerWidth) * 2 - 1
mouse.y = -(clientY / innerHeight) * 2 + 1
```

**Smoothing** (`dt` capped to **max 0.08** sec per frame in animation):

```
ease = 1 - exp(-pointerSharpness * dt)
mouseSm += (mouse - mouseSm) * ease    // component-wise
```

**World pointer on plane z = 0** (same as Golden Mask):

- `unproj.set(mouseSm.x, mouseSm.y, 0.5)` → `unproject(camera)`
- `dir = normalized(unproj - camera.position)`
- `t = -camera.position.z / dir.z`
- If **`t > 0`** and finite: `mouseWorld = camera.position + dir * t`
- Else fallback: **`mouseWorld = (mouseSm.x * 1.85, mouseSm.y * 1.85, 0)`**

**Wheel** (passive):

```
scrollZoom += deltaY * zoomSensitivity
scrollZoom clamp to [-0.9, 1.2]
zTarget = 2.35 - scrollZoom * 0.85
camera.position.z += (zTarget - camera.position.z) * (0.08 + dt * 4)
```

**Parallax** (after z chase):

```
camera.position.x = mouseSm.x * cameraParallax
camera.position.y = mouseSm.y * cameraParallax * 0.92
camera.lookAt(0, 0, 0)
```

---

## 10. Audio drive (optional)

If `window.__pmReactiveAudio.getDrive(elapsed)` exists:

```
aud = getDrive(elapsedTime)  // expects at least numeric-friendly fields:
```

Otherwise:

```
aud = { intensity: 1, curl: 1, flow: 1 }
```

Simulation uses:

- `mi = masterIntensity * aud.intensity`
- Curl scale: **`curlStrength * mi * aud.curl`**
- Flow time factor: **`elapsed * flowSpeed * aud.flow`**

---

## 11. Per-frame particle integration

Let **`t`** = smoothed elapsed time (**`clock.getElapsedTime() * flowSpeed * aud.flow`**).  
Positions **`arr`**, rest **`bx,by,bz`**, velocities **`vel`**.

Scalars:

```
mi = masterIntensity * aud.intensity
pushRadiusSq = radius * radius
repelScaled = repel * mi
swirlScaled = swirl * mi
damp = pow(velocityDamping, dt * 60)
```

For each particle index `i` stepping by 3:

```
bx = basePos[i], by = basePos[i+1], bz = basePos[i+2]
px = arr[i],     py = arr[i+1],   pz = arr[i+2]

dxm = px - mouseWorld.x
dym = py - mouseWorld.y
distSq = dxm^2 + dym^2 + 0.00008

fx = fy = fz = 0
```

**Pointer cone** (`distSq < pushRadiusSq`):

```
inv = 1 / distSq
falloff = (pushRadiusSq - distSq) / pushRadiusSq
push = repelScaled * falloff^2 * inv * 0.085
fx += dxm * push
fy += dym * push
invLen = 1 / sqrt(distSq)
fx += (-dym * invLen) * swirlScaled * falloff * 0.14
fy += (dxm * invLen) * swirlScaled * falloff * 0.14
```

**Curl noise** `curl2(bx * 3.2, by * 3.2, t)` with **`s = 2.1`**:

```
cx = sin(by*s + t*0.9) * cos(bx*s*0.7 - t*0.45)
cy = sin(bx*s - t*0.7) * cos(by*0.8*s + t*0.35)
curl = curlStrength * mi * aud.curl
fx += cx * curl
fy += cy * curl
```

**Spring toward rest**, **depth wobble** on target z:

```
fx += (bx - px) * spring
fy += (by - py) * spring
targetZWave = depthWobble * sin(t * 1.8 + bx * 5 + by * 3)
fz += (bz + targetZWave - pz) * spring * 0.68
```

**Semi-implicit Euler + damping:**

```
vel[i]   = (vel[i]   + fx * dt) * damp
vel[i+1] = (vel[i+1] + fy * dt) * damp
vel[i+2] = (vel[i+2] + fz * dt) * damp

arr[i] += vel[i];  arr[i+1] += vel[i+1];  arr[i+2] += vel[i+2]
```

Mark `position.needsUpdate = true`, then **`renderer.render(scene, camera)`**.

---

## 12. `resetPhysics` behaviour

Zero all **`vel`**; copy **`basePos`** into **`position`** array; set **`needsUpdate`**.

---

## 13. Page chrome (hints)

Footer hint styling (informative parity for CSS):

| Property | Value |
|----------|--------|
| Colour | `rgba(160,210,255,0.35)` |
| `text-shadow` | `0 0 8px rgba(0,140,255,0.35)` |

---

## 14. Launcher entry (Particle Madness `index.html`)

For shell parity, **`demoList`** item:

```javascript
{
    id: 'yin-yang-neon-mask',
    title: 'Neon Yin Yang',
    bgColor: '#000000',
    urls: {
        low: './experiments/yin-yang-neon-mask/index.html#particles=9000',
        medium: './experiments/yin-yang-neon-mask/index.html#particles=18000',
        high: './experiments/yin-yang-neon-mask/index.html#particles=28000'
    },
    colors: [0x22d3ee, 0x38bdf8, 0xf97316, 0xff5c29],
    speeds: [1.05, 0.0028, 0.75, 0.45, 3.1, 3.4]
}
```

The **`colors` / `speeds`** arrays configure the outer menu spinner only — they do not change WebGL internals.

---

## 15. Verification checklist

- [ ] Black clear + fog colour **`0x000000`** match.
- [ ] Sample **`w = 340`**, thresholds **`L < 0.05 + rand*0.32`**, xy jitter **`0.0045*(1-L)`**, z uniform **`[-0.014, +0.014]`** via **`(rand()-0.5)*0.028`**.
- [ ] **`neonTint`** branch order: **cool** then **warm** then neutral (mutually exclusive if only one of cool/warm; if both false, neutral).
- [ ] Physics scalars and **`0.00008`**, **`0.085`**, **`0.14`**, curl **`3.2`**, **`s=2.1`**, depth spring **0.68**, sin phase **`t*1.8 + bx*5 + by*3`**.
- [ ] Hash particle clamp and point-size ladder.

End of specification.
