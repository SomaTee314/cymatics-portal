# Elemental Yin Yang — visual + mouse interaction only

**File location (this repo):**

`experiments/yin-yang-elements/ELEMENTAL_YIN_YANG_PORT.md`

**Full path on your machine:**

`c:\Users\somat\Desktop\Cursor Projects\Particle\experiments\yin-yang-elements\ELEMENTAL_YIN_YANG_PORT.md`

Copy this file into your other project as-is, or copy only the **standalone HTML** block below (adjust image + Three.js script URLs).

---

## Dependencies

- **three.js r76** (same API as here: `BufferGeometry`, `addAttribute`, `THREE.VertexColors`, etc.). From this repo: `js/particle-love.com/js/three.r76.min.js`.
- Bitmap **`yin-yang-elements.png`** (same asset as `images/yin-yang-elements.png` here).

No dat.GUI, no reactive audio — motion uses the fixed numbers below.

---

## Visual (look)

| Setting | Value |
|--------|--------|
| Page / clear color | `#040408` → Three.js `0x040408` |
| Fog | `THREE.FogExp2(0x040408, 0.035)` |
| Ambient light | `THREE.AmbientLight(0x485878, 0.32)` |
| Points material | `vertexColors`, `transparent`, `opacity` **0.94**, `blending: THREE.AdditiveBlending`, `depthWrite: false`, `sizeAttenuation: true` |
| Pixel ratio | `min(devicePixelRatio, 2)` |
| Camera | FOV **50**, near **0.01**, far **100**, initial **`position.z = 2.35`** |

**Particle count:** URL hash `particles=(number)`, default **14000**, clamp **4000–48000**.

**Point size** by count: `>22000` → **0.0072**, `>12000` → **0.0082**, else **0.0094**.

### Sampling the image (same as shipped experiment)

- Raster width **560** px; height scales with aspect.
- Luminance `L = 0.299R + 0.587G + 0.114B` (0–1); alpha `a`.
- Sobel magnitude on `L`, normalized to **e ∈ [0,1]** over the frame (see original code if you need the exact stencil).
- Rejection sampling until `goal` particles or `goal * 140` tries:
  - Skip if `a < 0.04 + rand * 0.08`.
  - `lumStr = pow(max(0, L - 0.03), 0.72)`
  - `glow = pow(L, 2.4) * 0.42`
  - `silhouette = pow(1 - min(1, L * 1.08), 1.15) * 0.09`
  - `structural = lumStr * 0.56 + e * 0.51 + glow * 0.26 + silhouette`
  - Keep if `structural >= 0.11 + rand * 0.34`
- World span: `spanX = (w/h) * 1.18`, `spanY = 1.18`; `nx = (ix/w - 0.5) * spanX`, `ny = -(iy/h - 0.5) * spanY`
- Jitter: `edgeClamp = min(1, e * 1.25)`, `j = 0.0045 * (1 - L * 0.92) * (1 - edgeClamp * 0.72)`, z jitter ±**0.024**
- Color: `boost = 0.12 + L * 0.78 + e * 0.14`; RGB scaled then clamped with offsets **+0.04 / +0.02 / +0.05**

### Idle motion (still “visual”, not UI)

These run every frame so the cloud breathes; they are **not** driven by the panel:

- **Curl noise** on rest positions `(bx*3.2, by*3.2)` with strength **0.038**, scaled by **masterIntensity 1.35** (treat as constant **0.051** if you strip `controls`).
- **Flow time:** `elapsed * 1.15`
- **Spring** back to rest **5.8**; **velocity damping** `pow(0.965, dt * 60)`
- **Depth wobble:** `0.014 * sin(t*1.8 + bx*5 + by*3)` added into spring target z, spring factor **0.68** on z

Constants match the built-in defaults from the full experiment.

---

## Mouse / wheel interaction

| Input | Behavior |
|-------|----------|
| Pointer | `mouse.x = (clientX/innerWidth)*2 - 1`, `mouse.y = -(clientY/innerHeight)*2 + 1` |
| Smoothing | `ease = 1 - exp(-28 * dt)`; `mouseSm → mouse` |
| World hit | Unproject `(mouseSm.x, mouseSm.y, 0.5)`; ray vs plane z=0: `t = -cam.z / dir.z`; else fallback `(mouseSm.x * 1.85, mouseSm.y * 1.85, 0)` |
| Wheel | `scrollZoom += deltaY * 0.00055`, clamp **[-0.9, 1.2]**; camera `zTarget = 2.35 - scrollZoom * 0.85`, chase with `(zTarget - z) * (0.08 + dt*4)` |
| Parallax | `cam.x = mouseSm.x * 0.055`, `cam.y = mouseSm.y * 0.055 * 0.92`, `lookAt(0,0,0)` |

**Near pointer** (use **masterIntensity 1.35** times below):

- `pushRadius = 0.5`, `pushRadiusSq = 0.25`
- `distSq = dx² + dy² + 0.00008`
- If `distSq < pushRadiusSq`:  
  `falloff = (pushRadiusSq - distSq) / pushRadiusSq`  
  `push = (repel * mi) * falloff² * (1/distSq) * 0.085` along `(dx, dy)`  
  tangential **swirl**: `(repel replaced)` use **`repel = 4.2 * mi`**, **`swirl = 2.4 * mi`** — swirl adds `(-dy/dist, dx/dist) * swirl * falloff * 0.14`

Exact scalar replication:

```
mi = 1.35  // masterIntensity
repel = 4.2 * mi
swirl = 2.4 * mi
```

Then curl + spring + depth terms as in §idle motion.

---

## Standalone HTML (paste into another project)

Change **`IMAGE_URL`** and **`THREE_SCRIPT`** paths. No GUI.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Elemental Yin Yang</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #040408; }
    canvas { display: block; position: fixed; inset: 0; width: 100% !important; height: 100% !important; }
  </style>
  <script src="THREE_SCRIPT"></script>
</head>
<body>
<script>
(function () {
  var IMAGE_URL = 'yin-yang-elements.png'; /* path relative to this HTML */

  function particleGoal() {
    var m = window.location.hash.match(/particles=(\d+)/i);
    var n = m ? parseInt(m[1], 10) : 14000;
    return Math.min(48000, Math.max(4000, n));
  }

  var MASTER = 1.35, POINTER_SHARP = 28, REPEL = 4.2, SWIRL = 2.4, RADIUS = 0.5;
  var SPRING = 5.8, DAMPING = 0.965, CURL = 0.038, FLOW = 1.15, DEPTH_W = 0.014;
  var PARALLAX = 0.055, ZOOM_SENS = 0.00055;
  var POINT_OPACITY = 0.94, FOG_D = 0.035;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 2.35;
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x040408, 1);
  document.body.appendChild(renderer.domElement);

  var mouse = new THREE.Vector2(0, 0), mouseSm = new THREE.Vector2(0, 0), scrollZoom = 0;
  var _unproj = new THREE.Vector3(), _dir = new THREE.Vector3(), mouseWorld = new THREE.Vector3();
  var geom = null, basePos = null, vel = null, pointsMaterial = null;
  var clock = new THREE.Clock();

  function resize() {
    var w = innerWidth, h = innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, true);
  }
  window.addEventListener('resize', resize);
  resize();

  function onPointer(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  window.addEventListener('wheel', function (e) {
    scrollZoom += e.deltaY * ZOOM_SENS;
    scrollZoom = Math.max(-0.9, Math.min(1.2, scrollZoom));
  }, { passive: true });

  function updateMouseWorld(ndcX, ndcY) {
    _unproj.set(ndcX, ndcY, 0.5);
    _unproj.unproject(camera);
    _dir.copy(_unproj).sub(camera.position).normalize();
    var t = -camera.position.z / _dir.z;
    if (t > 0 && isFinite(t)) mouseWorld.copy(camera.position).add(_dir.multiplyScalar(t));
    else mouseWorld.set(ndcX * 1.85, ndcY * 1.85, 0);
  }

  function curl2(px, py, time) {
    var s = 2.1;
    return {
      x: Math.sin(py * s + time * 0.9) * Math.cos(px * s * 0.7 - time * 0.45),
      y: Math.sin(px * s - time * 0.7) * Math.cos(py * 0.8 * s + time * 0.35)
    };
  }

  function buildParticles(img) {
    var goal = particleGoal();
    var pw = 560;
    var ph = img ? Math.max(32, Math.round(img.height * (pw / img.width))) : 400;
    var canvas = document.createElement('canvas');
    canvas.width = pw;
    canvas.height = ph;
    var ctx = canvas.getContext('2d');
    if (img) ctx.drawImage(img, 0, 0, pw, ph);
    else {
      ctx.fillStyle = '#0c0608';
      ctx.fillRect(0, 0, pw, ph);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 80px serif';
      ctx.textAlign = 'center';
      ctx.fillText('Yin Yang', pw / 2, ph / 2);
    }
    var im = ctx.getImageData(0, 0, pw, ph);
    var data = im.data;

    function lumAlpha(ix, iy) {
      var i = (iy * pw + ix) * 4;
      return {
        L: (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255,
        a: data[i + 3] / 255
      };
    }

    var lumBuf = new Float32Array(pw * ph);
    var edgeBuf = new Float32Array(pw * ph);
    var xx, yy, idx, gx, gy, gxx, emax = 1e-8;
    for (yy = 0; yy < ph; yy++) for (xx = 0; xx < pw; xx++) lumBuf[yy * pw + xx] = lumAlpha(xx, yy).L;
    for (yy = 1; yy < ph - 1; yy++) {
      for (xx = 1; xx < pw - 1; xx++) {
        idx = yy * pw + xx;
        gx = -lumBuf[idx - pw - 1] - 2 * lumBuf[idx - 1] - lumBuf[idx + pw - 1]
           + lumBuf[idx - pw + 1] + 2 * lumBuf[idx + 1] + lumBuf[idx + pw + 1];
        gy = -lumBuf[idx - pw - 1] - 2 * lumBuf[idx - pw] - lumBuf[idx - pw + 1]
           + lumBuf[idx + pw - 1] + 2 * lumBuf[idx + pw] + lumBuf[idx + pw + 1];
        gxx = gx * gx + gy * gy;
        edgeBuf[idx] = gxx;
        if (gxx > emax) emax = gxx;
      }
    }
    emax = Math.sqrt(emax);
    for (idx = 0; idx < edgeBuf.length; idx++)
      edgeBuf[idx] = emax > 1e-6 ? Math.min(1, Math.sqrt(edgeBuf[idx]) / emax) : 0;

    var aspectImg = pw / ph;
    var spanX = aspectImg * 1.18;
    var spanY = 1.18;
    var pos = [];
    var col = [];
    var tries = 0;
    var maxTries = goal * 140;
    while (pos.length / 3 < goal && tries < maxTries) {
      tries++;
      var ix = Math.floor(Math.random() * pw);
      var iy = Math.floor(Math.random() * ph);
      var la = lumAlpha(ix, iy);
      var L = la.L;
      var a = la.a;
      if (a < 0.04 + Math.random() * 0.08) continue;
      var e = edgeBuf[iy * pw + ix];
      var lumStr = Math.pow(Math.max(0, L - 0.03), 0.72);
      var glow = Math.pow(L, 2.4) * 0.42;
      var silhouette = Math.pow(1 - Math.min(1, L * 1.08), 1.15) * 0.09;
      var structural = lumStr * 0.56 + e * 0.51 + glow * 0.26 + silhouette;
      if (structural < 0.11 + Math.random() * 0.34) continue;
      var nx = (ix / pw - 0.5) * spanX;
      var ny = -(iy / ph - 0.5) * spanY;
      var edgeClamp = Math.min(1, e * 1.25);
      var j = 0.0045 * (1 - L * 0.92) * (1 - edgeClamp * 0.72);
      pos.push(nx + (Math.random() - 0.5) * j, ny + (Math.random() - 0.5) * j, (Math.random() - 0.5) * 0.024);
      idx = (iy * pw + ix) * 4;
      var r = data[idx] / 255, gch = data[idx + 1] / 255, b = data[idx + 2] / 255;
      var boost = 0.12 + L * 0.78 + e * 0.14;
      col.push(Math.min(1, r * boost + 0.04), Math.min(1, gch * boost + 0.02), Math.min(1, b * boost + 0.05));
    }

    var psz = goal > 22000 ? 0.0072 : goal > 12000 ? 0.0082 : 0.0094;
    basePos = new Float32Array(pos);
    vel = new Float32Array(pos.length);
    geom = new THREE.BufferGeometry();
    geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geom.addAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    pointsMaterial = new THREE.PointsMaterial({
      size: psz,
      vertexColors: THREE.VertexColors,
      transparent: true,
      opacity: POINT_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    scene.add(new THREE.Points(geom, pointsMaterial));
    scene.add(new THREE.AmbientLight(0x485878, 0.32));
    scene.fog = new THREE.FogExp2(0x040408, FOG_D);
  }

  var loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';
  loader.load(IMAGE_URL, function (tex) { buildParticles(tex.image); }, undefined, function () { buildParticles(null); });

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.08);
    var t = clock.getElapsedTime() * FLOW;
    var ease = 1 - Math.exp(-POINTER_SHARP * dt);
    mouseSm.x += (mouse.x - mouseSm.x) * ease;
    mouseSm.y += (mouse.y - mouseSm.y) * ease;
    updateMouseWorld(mouseSm.x, mouseSm.y);

    var zTarget = 2.35 - scrollZoom * 0.85;
    camera.position.z += (zTarget - camera.position.z) * (0.08 + dt * 4);
    camera.position.x = mouseSm.x * PARALLAX;
    camera.position.y = mouseSm.y * PARALLAX * 0.92;
    camera.lookAt(scene.position);

    if (geom && basePos && vel) {
      var arr = geom.attributes.position.array;
      var mx = mouseWorld.x;
      var my = mouseWorld.y;
      var mi = MASTER;
      var pushRadiusSq = RADIUS * RADIUS;
      var repel = REPEL * mi;
      var swirl = SWIRL * mi;
      var damp = Math.pow(DAMPING, dt * 60);

      for (var i = 0; i < arr.length; i += 3) {
        var bx = basePos[i], by = basePos[i + 1], bz = basePos[i + 2];
        var px = arr[i], py = arr[i + 1], pz = arr[i + 2];
        var dxm = px - mx, dym = py - my;
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
          fy += (dxm * invLen) * swirl * falloff * 0.14;
        }

        var c = curl2(bx * 3.2, by * 3.2, t);
        var curl = CURL * mi;
        fx += c.x * curl;
        fy += c.y * curl;

        fx += (bx - px) * SPRING;
        fy += (by - py) * SPRING;
        fz += (bz + DEPTH_W * Math.sin(t * 1.8 + bx * 5 + by * 3) - pz) * (SPRING * 0.68);

        vel[i] = (vel[i] + fx * dt) * damp;
        vel[i + 1] = (vel[i + 1] + fy * dt) * damp;
        vel[i + 2] = (vel[i + 2] + fz * dt) * damp;
        arr[i] += vel[i];
        arr[i + 1] += vel[i + 1];
        arr[i + 2] += vel[i + 2];
      }
      geom.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  animate();
})();
</script>
</body>
</html>
```

Replace **`THREE_SCRIPT`** with your r76 script URL/path (e.g. `./three.r76.min.js`).
