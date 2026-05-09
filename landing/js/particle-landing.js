/**
 * Cymatics landing: Neon Yin–Yang mask iframe (THREE r76) + legacy overlay shell.
 * Background visual: landing/yin-yang-neon-mask/index.html (spec: landing/yin-yang-neon-mask/NEON_YIN_YANG_PORT.md).
 * Legacy Yin–Yang canvas path retained as dead code (yin-yang-elements/ELEMENTAL_YIN_YANG_PORT.md).
 */
(function () {
  if (!window.THREE || !window.TweenMax) return;
  var THREE = window.THREE;
  var M = window.TweenMax;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function landingLoadProgress(pct) {
    try {
      var p = clamp(Math.round(pct), 0, 100);
      window.__cpLandingBootPct = p;
      window.dispatchEvent(
        new CustomEvent('cp-landing-progress', { detail: p })
      );
    } catch (_z) {}
  }

  var assetRoot =
    (typeof window !== 'undefined' && window.__pmAssetPath) ? window.__pmAssetPath : './landing/';
  if (assetRoot.slice(-1) !== '/') assetRoot += '/';

  /** Larger silhouette + tighter camera so the formation fills more of the viewport (see scale plan). */
  var WORLD_SCALE = 1.72;
  var YIN_CAMERA_FOV = 54;
  var YIN_CAMERA_Z_BASE = 1.98;
  var PSZ_SCENE_SCALE = Math.sqrt(WORLD_SCALE);
  /** Slow counter-clockwise drift; base ~4.75 min/turn ×1.7 ×1.6 (+ additional +60pct). */
  var YIN_SLOW_SPIN = ((2 * Math.PI) / (4.75 * 60)) * 1.7 * 1.6;

  /** Stage-1: short paint window so the boot veil renders before quality auto-click. */
  function quickLoaderStart(done) {
    var t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    function step() {
      var now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - t0 < 400) {
        requestAnimationFrame(step);
        return;
      }
      landingLoadProgress(6);
      requestAnimationFrame(function () {
        landingLoadProgress(12);
        done(1);
      });
    }
    requestAnimationFrame(step);
  }

  /** Motion-blur stubs (landing shell still assigns properties) */
  var R = {
    motionRenderTargetScale: 1,
    maxDistance: 120,
    useDithering: true,
    useFloatLinear: false
  };

  var Yin = {
    renderer: null,
    scene: null,
    clock: null,
    geom: null,
    basePos: null,
    vel: null,
    pointsMat: null,
    particlesRoot: null,
    rafId: 0,
    mouse: null,
    mouseSm: null,
    scrollZoom: 0,
    paused: false,
    /** True after first pointer event; (0,0) NDC is screen centre — repel there caused an Om-sized void on load. */
    pointerRepelActive: false,
    /** Two matching hollow pupils `{cx,cy,rsq}` — ice + fire both voids; Om guard skips rejection near hub only. */
    eyeVoids: null,
    /** Warm/cool centroid world XY for `classifyLobeXYAny`. */
    lobeClass: null,
    /** Squared Om-centre guard radius (world XY); pupil void rejection / repulsion toned down inside this hub disk. */
    omGuardSq: null
  };

  var T = {
    quality: 0,
    qualityList: ['low', 'medium', 'high'],
    motionBlur: false,
    particlesMotionTextureWidth: 256,
    particlesMotionTextureHeight: 256,
    skipRendering: false,
    speed: 3,
    curlSize: 1e-4,
    particlesOuterSpeed: 0.65,
    particlesEmittingSpeed: 1,
    particlesEmittingStrength: 1,
    particlesEmittingFriction: 2,
    isMobile: /(iPad|iPhone|Android)/i.test(navigator.userAgent),
    camera: null
  };

  /** Demo colour tween targets (landing shell writes setHex — no shader impact) */
  var A = {
    size: 2,
    color1: THREE ? new THREE.Color(0xffffff) : null,
    color2: THREE ? new THREE.Color(0xffffff) : null,
    color3: THREE ? new THREE.Color(0xffffff) : null,
    color4: THREE ? new THREE.Color(0xffffff) : null
  };

  /** Post-process analogue for CSS blur on `.ui` (GSAP tween target) */
  var I = { ratio: 0, blurRadius: 2.5, amount: 0.0001 };
  function syncIBlurToUi(ui) {
    if (!ui) return;
    var amt = Number(I.amount) || 0;
    var rad = Number(I.blurRadius) || 0;
    var px = Math.min(26, amt * rad * 0.12);
    if (px > 0.35) ui.style.filter = 'blur(' + px + 'px)';
    else ui.style.filter = '';
  }

  var DemoList = window.demoList;
  var DemoIndex = 0;
  var camOrbitScratch = THREE ? new THREE.Vector3() : null;

  var dom = {
    root: null,
    body: null,
    canvas: null,
    ui: null,
    logo: null,
    qualitySel: null,
    qualityTitle: null,
    qualityBtns: null,
    menu: null,
    iframeBox: null,
    titlesWrap: null,
    titlesMove: null,
    goBtn: null,
    goSpinner: null,
    arrows: null,
    closeBtn: null
  };

  var G = null;
  var iframeRef = null;

  function particleCountForTier() {
    var m = window.location.hash.match(/particles=(\d+)/i);
    if (m) {
      var n = parseInt(m[1], 10);
      return clamp(n, 4000, 48000);
    }
    var tier = [16000, 22000, 36000][T.quality] || 22000;
    return clamp(tier, 4000, 48000);
  }

  function classifyLobeXYAny(nxw, nyw, L) {
    if (!L) return 1;
    var dWa =
      (nxw - L.wwX) * (nxw - L.wwX) +
      (nyw - L.wwY) * (nyw - L.wwY);
    var dCa =
      (nxw - L.cwX) * (nxw - L.cwX) +
      (nyw - L.cwY) * (nyw - L.cwY);
    return dWa < dCa ? 1 : -1;
  }

  function curl2(px, py, time) {
    var s = 2.1;
    return {
      x: Math.sin(py * s + time * 0.9) * Math.cos(px * s * 0.7 - time * 0.45),
      y: Math.sin(px * s - time * 0.7) * Math.cos(py * 0.8 * s + time * 0.35)
    };
  }

  function teardownYinScene() {
    if (Yin.rafId) {
      cancelAnimationFrame(Yin.rafId);
      Yin.rafId = 0;
    }
    if (Yin.renderer) {
      try {
        Yin.renderer.dispose();
      } catch (_) {}
      Yin.renderer = null;
    }
    Yin.scene = null;
    Yin.geom = null;
    Yin.basePos = null;
    Yin.vel = null;
    Yin.pointsMat = null;
    Yin.particlesRoot = null;
    Yin.pointerRepelActive = false;
    Yin.eyeVoids = null;
    Yin.omGuardSq = null;
    Yin.lobeClass = null;
    Yin.clock = null;
  }

  function buildParticles(img, camera, scene, goalOverride) {
    var goal =
      typeof goalOverride === 'number'
        ? clamp(goalOverride, 4000, 48000)
        : particleCountForTier();

    var pw = 560;
    var ph = img ? Math.max(32, Math.round(img.height * (pw / img.width))) : 400;

    var c2 = document.createElement('canvas');
    c2.width = pw;
    c2.height = ph;
    var ctx = c2.getContext('2d');
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
      var k = (iy * pw + ix) * 4;
      var L =
        (0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2]) /
        255;
      var a = data[k + 3] / 255;
      return { L: L, a: a };
    }

    var lumBuf = new Float32Array(pw * ph);
    var edgeBuf = new Float32Array(pw * ph);
    var xx, yy, idx, gx, gy, gxx;
    var emax = 1e-8;
    for (yy = 0; yy < ph; yy++) {
      for (xx = 0; xx < pw; xx++) {
        lumBuf[yy * pw + xx] = lumAlpha(xx, yy).L;
      }
    }
    for (yy = 1; yy < ph - 1; yy++) {
      for (xx = 1; xx < pw - 1; xx++) {
        idx = yy * pw + xx;
        gx =
          -lumBuf[idx - pw - 1] -
          2 * lumBuf[idx - 1] -
          lumBuf[idx + pw - 1] +
          lumBuf[idx - pw + 1] +
          2 * lumBuf[idx + 1] +
          lumBuf[idx + pw + 1];
        gy =
          -lumBuf[idx - pw - 1] -
          2 * lumBuf[idx - pw] -
          lumBuf[idx - pw + 1] +
          lumBuf[idx + pw - 1] +
          2 * lumBuf[idx + pw] +
          lumBuf[idx + pw + 1];
        gxx = gx * gx + gy * gy;
        edgeBuf[idx] = gxx;
        if (gxx > emax) emax = gxx;
      }
    }
    emax = Math.sqrt(emax);
    for (idx = 0; idx < edgeBuf.length; idx++) {
      edgeBuf[idx] = emax > 1e-6 ? Math.min(1, Math.sqrt(edgeBuf[idx]) / emax) : 0;
    }

    var aspectImg = pw / ph;
    /** Slightly larger world span (~+7%) so tails read as closing the circular glyph. */
    var spanStretch = 1.265 * 1.04;
    var spanX = aspectImg * spanStretch * WORLD_SCALE;
    var spanY = spanStretch * WORLD_SCALE;

    /**
     * Masked warm / cool raster centroids (yin-yang-elements.png) — separated in v to stabilise classifyWorldXY
     * and hue clamp across the S-divide after physics blur.
     */
    var UV_WARM_CORE = [0.601, 0.627];
    var UV_COOL_CORE = [0.348, 0.526];

    /**
     * Matching hollow pupils: one UV anchor on the cool lobe; warm pupil is 180° about image centre (1−u, 1−v).
     * Keeps both eyes same size and mirrored for clear yin–yang alignment (source asset may be asymmetric).
     */
    var PUPIL_ICE_U = 0.423;
    var PUPIL_ICE_V = 0.555;
    var YIN_EYE_UV = [
      [PUPIL_ICE_U, PUPIL_ICE_V],
      [1 - PUPIL_ICE_U, 1 - PUPIL_ICE_V],
    ];

    /** Snap sampled RGB toward fire vs ice lobes + hard channel caps (additive blend otherwise reblooms teal in fire). */
    function remapLobeRgb(ixp, iy, rpIn, gpIn, bpIn) {
      var u = (clamp(ixp, 0, pw - 1) + 0.45) / pw;
      var v = (clamp(iy, 0, ph - 1) + 0.45) / ph;
      var dxW = u - UV_WARM_CORE[0];
      var dyW = v - UV_WARM_CORE[1];
      var dxC = u - UV_COOL_CORE[0];
      var dyC = v - UV_COOL_CORE[1];
      var dW = dxW * dxW + dyW * dyW;
      var dC = dxC * dxC + dyC * dyC;
      var margin = 0.007;
      var side = 0;
      if (dW + margin < dC) side = 1;
      else if (dC + margin < dW) side = -1;
      else {
        if (
          rpIn > Math.max(gpIn, bpIn) + 0.025 &&
          rpIn >= gpIn * 0.86
        )
          side = 1;
        else if (gpIn > rpIn + 0.02 && gpIn + bpIn * 0.4 > rpIn * 1.55)
          side = -1;
      }
      if (side === 0)
        return { r: rpIn, g: gpIn, b: bpIn, side: 0 };
      var blend = side === 1 ? 0.74 : 0.69;
      var tr = side === 1 ? 0.96 : 0.06;
      var tg = side === 1 ? 0.32 : 0.82;
      var tb = side === 1 ? 0.07 : 0.995;
      var rx = rpIn + (tr - rpIn) * blend;
      var gx = gpIn + (tg - gpIn) * blend;
      var bx = bpIn + (tb - bpIn) * blend;
      if (side === 1) {
        var fireCapB =
          Math.min(0.31, rx * 0.2 + gx * 0.14 + 0.03);
        bx = Math.min(bx, fireCapB);
        rx = Math.min(1, rx * 1.06 + 0.038);
        var gCap = rx * 0.58 + 0.09;
        gx = Math.min(gx, Math.max(gpIn * 0.35 + 0.02, gCap));
      } else if (side === -1) {
        var iceCapR =
          Math.min(0.35, gx * 0.18 + bx * 0.16 + 0.035);
        rx = Math.min(rx, iceCapR);
        gx = Math.min(1, gx * 1.035 + 0.018);
        bx = Math.min(1, bx * 1.075 + 0.022);
        gx = Math.min(gx, bx * 0.97 + 0.045);
      }
      return {
        r: clamp(rx, 0, 1),
        g: clamp(gx, 0, 1),
        b: clamp(bx, 0, 1),
        side: side
      };
    }

    /** Om-centre guard (world XY): narrow — only clears overlap where eye disks graze the glyph hub (see spawn skip below). */
    var OM_GUARD_RADIUS = 0.032 * WORLD_SCALE;
    var omGuardSq = OM_GUARD_RADIUS * OM_GUARD_RADIUS;

    /** Matching circular void radius in world XY for both pupils. */
    var eyeVoidR =
      Math.max((51 / ph) * spanY, 0.048 * WORLD_SCALE) * 0.9;
    var eyeVoidRsq = eyeVoidR * eyeVoidR;

    var eyeHoleSpecs = [];
    for (var eh = 0; eh < YIN_EYE_UV.length; eh++) {
      var uE = YIN_EYE_UV[eh][0];
      var vE = YIN_EYE_UV[eh][1];
      eyeHoleSpecs.push({
        cx: (uE - 0.5) * spanX,
        cy: -(vE - 0.5) * spanY,
        rsq: eyeVoidRsq,
      });
    }
    Yin.eyeVoids = eyeHoleSpecs;
    Yin.omGuardSq = omGuardSq;

    function inEyeVoidDisk(wx, wy) {
      var he;
      for (he = 0; he < eyeHoleSpecs.length; he++) {
        var exx = wx - eyeHoleSpecs[he].cx;
        var eyy = wy - eyeHoleSpecs[he].cy;
        if (exx * exx + eyy * eyy <= eyeHoleSpecs[he].rsq) return true;
      }
      return false;
    }

    var wWarmX = (UV_WARM_CORE[0] - 0.5) * spanX;
    var wWarmY = -(UV_WARM_CORE[1] - 0.5) * spanY;
    var wCoolX = (UV_COOL_CORE[0] - 0.5) * spanX;
    var wCoolY = -(UV_COOL_CORE[1] - 0.5) * spanY;

    Yin.lobeClass = {
      wwX: wWarmX,
      wwY: wWarmY,
      cwX: wCoolX,
      cwY: wCoolY,
    };

    /**
     * Per-texel lobe from yin-yang-elements.png chroma (R vs B) with centroid fallback.
     * Centroid-only classify misses the painted S-divide — this restores a sharp ice|fire rim like the reference.
     */
    var lobePx = new Int8Array(pw * ph);
    var yyL, xxL;
    for (yyL = 0; yyL < ph; yyL++) {
      for (xxL = 0; xxL < pw; xxL++) {
        var ixL = yyL * pw + xxL;
        if (lumAlpha(xxL, yyL).a < 0.06) {
          lobePx[ixL] = 0;
          continue;
        }
        var ixD = ixL * 4;
        var rL = data[ixD] / 255;
        var bL = data[ixD + 2] / 255;
        var dRB = rL - bL;
        if (dRB > 0.085) lobePx[ixL] = 1;
        else if (dRB < -0.085) lobePx[ixL] = -1;
        else {
          var nxLa = (xxL / pw - 0.5) * spanX;
          var nyLa = -(yyL / ph - 0.5) * spanY;
          lobePx[ixL] =
            classifyLobeXYAny(nxLa, nyLa, Yin.lobeClass) === 1 ? 1 : -1;
        }
      }
    }

    function classifyWorldXY(nxw, nyw) {
      return classifyLobeXYAny(nxw, nyw, Yin.lobeClass);
    }

    function elementalRgbSecondPass(rIn, gIn, bIn, sideEff) {
      if (sideEff !== 1 && sideEff !== -1)
        return { r: rIn, g: gIn, b: bIn };
      if (sideEff === 1) {
        var bOut = Math.min(
          bIn,
          Math.min(0.22, rIn * 0.14 + gIn * 0.07 + 0.025)
        );
        var rOut = Math.min(1, rIn * 1.14 + 0.065);
        var gFire = Math.min(gIn, rOut * 0.51 + 0.09);
        var gCapFire = rOut * 0.53 + 0.055;
        return { r: rOut, g: Math.min(gFire, gCapFire), b: bOut };
      }
      var rOut = Math.min(
        rIn,
        Math.min(0.265, gIn * 0.13 + bIn * 0.13 + 0.032)
      );
      var gIce = Math.min(1, gIn * 1.02 + 0.014);
      var bIce = Math.min(1, bIn * 1.118 + 0.048);
      gIce = Math.min(gIce, bIce * 0.986 + 0.042);
      if (gIce > bIce * 1.04) gIce *= 0.8;
      return {
        r: rOut,
        g: gIce,
        b: bIce,
      };
    }

    var pos = [];
    var col = [];
    var tries = 0;
    var maxTries = goal * 368;
    var fillCap = goal;

    while (pos.length / 3 < fillCap && tries < maxTries) {
      tries++;
      var pickMode = Math.random();
      var ix;
      var iy;
      if (pickMode < 0.52) {
        var gotOuter = false;
        for (var ou = 0; ou < 44; ou++) {
          var ox = Math.floor(Math.random() * pw);
          var oy = Math.floor(Math.random() * ph);
          var du = ox / pw - 0.5;
          var dv = oy / ph - 0.5;
          var ruv = Math.sqrt(du * du + dv * dv);
          var laO = lumAlpha(ox, oy);
          var edOu = edgeBuf[oy * pw + ox];
          if (
            ruv >= 0.25 &&
            ruv <= 0.635 &&
            laO.a > 0.055 &&
            edOu > 0.068
          ) {
            ix = ox;
            iy = oy;
            gotOuter = true;
            break;
          }
        }
        if (!gotOuter) {
          ix = Math.floor(Math.random() * pw);
          iy = Math.floor(Math.random() * ph);
        }
      } else if (pickMode < 0.71) {
        var picked = false;
        for (var att = 0; att < 16; att++) {
          var tx = Math.floor(Math.random() * pw);
          var ty = Math.floor(Math.random() * ph);
          if (edgeBuf[ty * pw + tx] > 0.17) {
            ix = tx;
            iy = ty;
            picked = true;
            break;
          }
        }
        if (!picked) {
          ix = Math.floor(Math.random() * pw);
          iy = Math.floor(Math.random() * ph);
        }
      } else {
        ix = Math.floor(Math.random() * pw);
        iy = Math.floor(Math.random() * ph);
      }
      var la = lumAlpha(ix, iy);
      var L = la.L;
      var alp = la.a;
      if (alp < 0.04 + Math.random() * 0.08) continue;
      var ed = edgeBuf[iy * pw + ix];
      idx = (iy * pw + ix) * 4;
      var rp = data[idx] / 255;
      var gp = data[idx + 1] / 255;
      var bp = data[idx + 2] / 255;
      var cmax = Math.max(rp, gp, bp);
      var cmin = Math.min(rp, gp, bp);
      var chroma = cmax - cmin;
      var lumStr = Math.pow(Math.max(0, L - 0.03), 0.72);
      var glow = Math.pow(L, 2.4) * 0.42;
      var silhouette =
        Math.pow(1 - Math.min(1, L * 1.08), 1.15) * 0.09;
      var edgeStrokeBump = ed * (0.065 + (1 - Math.min(1, L * 1.02)) * 0.14);
      var hueFill =
        chroma * (0.2 + (1 - L) * 0.3) * (0.42 + alp * 0.58);
      var dotAccent =
        chroma > 0.09 && L > 0.05 && L < 0.65 ? chroma * 0.48 : 0;
      var ctrU = ix / pw - 0.5;
      var ctrV = iy / ph - 0.5;
      var rImg = Math.sqrt(ctrU * ctrU + ctrV * ctrV);
      var structural =
        lumStr * 0.54 +
        ed * (0.58 + (rImg > 0.28 ? 0.22 : 0)) +
        glow * 0.26 +
        silhouette +
        hueFill * 0.56 +
        dotAccent +
        edgeStrokeBump;
      /** Inner hub — fill around Om without a black moat between lobes */
      if (rImg < 0.235)
        structural += 0.22 * (1 - rImg / 0.235);
      /** Paisley “arms”: favour glyph outline so the comma wraps toward a circular rim */
      if (rImg > 0.3 && rImg < 0.58) {
        var ringT = Math.min(
          1,
          (rImg - 0.3) / (0.58 - 0.3),
          (0.58 - rImg) / (0.58 - 0.3)
        );
        structural += 0.2 * ringT + ed * 0.34 * ringT;
      }
      var nxPre = ctrU * spanX;
      var nyPre = -ctrV * spanY;
      if (structural < 0.074 + Math.random() * 0.26) continue;
      var nx = nxPre;
      var ny = nyPre;
      var edgeClamp = Math.min(1, ed * 1.25);
      var jitterTight =
        Math.abs(rp - bp) < 0.08 ? 0.45 : Math.abs(rp - bp) < 0.14 ? 0.68 : 1;
      var jitterAmt =
        0.00285 *
        jitterTight *
        (1 - L * 0.92) *
        (1 - edgeClamp * 0.72);
      var jnx =
        nx + (Math.random() - 0.5) * jitterAmt;
      var jny =
        ny + (Math.random() - 0.5) * jitterAmt;
      var jnz = (Math.random() - 0.5) * 0.024 * WORLD_SCALE;
      var jDistSq = jnx * jnx + jny * jny;
      var eyeHit =
        inEyeVoidDisk(jnx, jny) ||
        inEyeVoidDisk(nx, ny);
      if (jDistSq >= omGuardSq && eyeHit) continue;
      /** Chromatic mask from raster + jitter cell — centroid alone smears paint across the S-curve vs reference. */
      var sideUse =
        lobePx[iy * pw + ix] !== 0
          ? lobePx[iy * pw + ix]
          : classifyWorldXY(nx, ny);
      var jix = clamp(Math.floor((jnx / spanX + 0.5) * pw), 0, pw - 1);
      var jiy = clamp(Math.floor((-jny / spanY + 0.5) * ph), 0, ph - 1);
      var lobeJit =
        lobePx[jiy * pw + jix] !== 0
          ? lobePx[jiy * pw + jix]
          : classifyWorldXY(jnx, jny);
      /**
       * Reject jitter only when BOTH texture cell and centroid disagree with texel hue — strict per-pixel equality
       * carved a void along the S-curve (two vertical slabs). Loose OR restores the interlocking comma fill.
       */
      var cenJit = classifyWorldXY(jnx, jny);
      if (lobeJit !== sideUse && cenJit !== sideUse) continue;

      var mm = remapLobeRgb(ix, iy, rp, gp, bp);
      if (
        chroma > 0.11 &&
        mm.side !== 0 &&
        mm.side !== sideUse
      )
        continue;
      pos.push(jnx, jny, jnz);
      var ec = elementalRgbSecondPass(mm.r, mm.g, mm.b, sideUse);
      var boost = 0.22 + L * 0.95 + ed * 0.21;
      var roff = sideUse === 1 ? 0.07 : sideUse === -1 ? 0.048 : 0.055;
      var goff = 0.034;
      var boff = sideUse === -1 ? 0.095 : sideUse === 1 ? 0.045 : 0.06;
      col.push(
        Math.min(1, ec.r * boost + roff),
        Math.min(1, ec.g * boost + goff),
        Math.min(1, ec.b * boost + boff)
      );
    }

    var pszBase =
      goal > 20000 ? 0.0072 : goal > 11000 ? 0.0082 : 0.0094;
    var psz = pszBase * PSZ_SCENE_SCALE * 1.12;

    var basePos = new Float32Array(pos);
    Yin.basePos = basePos;
    Yin.vel = new Float32Array(pos.length);

    var geom = new THREE.BufferGeometry();
    geom.addAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(pos), 3)
    );
    geom.addAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(col), 3)
    );
    Yin.geom = geom;

    var pointsMat = new THREE.PointsMaterial({
      size: psz,
      vertexColors: THREE.VertexColors,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    Yin.pointsMat = pointsMat;

    scene.add(new THREE.AmbientLight(0x5a6890, 0.44));
    scene.fog = new THREE.FogExp2(0x040408, 0.024);

    var mesh = new THREE.Points(geom, pointsMat);
    var pRoot = new THREE.Group();
    pRoot.rotation.z = 0;
    pRoot.add(mesh);
    scene.add(pRoot);
    Yin.particlesRoot = pRoot;
  }

  var _unproj = new THREE.Vector3();
  var _dir = new THREE.Vector3();
  var _mouseWorld = new THREE.Vector3();

  function updateMouseWorld(cam, ndcX, ndcY) {
    _unproj.set(ndcX, ndcY, 0.5);
    _unproj.unproject(cam);
    _dir.copy(_unproj).sub(cam.position).normalize();
    var t = -cam.position.z / _dir.z;
    if (t > 0 && isFinite(t)) _mouseWorld.copy(cam.position).add(_dir.multiplyScalar(t));
    else _mouseWorld.set(ndcX * 1.85 * WORLD_SCALE, ndcY * 1.85 * WORLD_SCALE, 0);
  }

  function yinAnimate() {
    Yin.rafId = requestAnimationFrame(yinAnimate);
    if (
      typeof document !== 'undefined' &&
      document.hidden
    )
      return;
    if (!Yin.renderer || !Yin.scene || !T.camera || T.skipRendering || Yin.paused) return;

    var dt = Math.min(Yin.clock.getDelta(), 0.08);
    var t = Yin.clock.getElapsedTime() * 1.15;

    var ease = 1 - Math.exp(-28 * dt);
    Yin.mouseSm.x += (Yin.mouse.x - Yin.mouseSm.x) * ease;
    Yin.mouseSm.y += (Yin.mouse.y - Yin.mouseSm.y) * ease;
    updateMouseWorld(T.camera, Yin.mouseSm.x, Yin.mouseSm.y);

    var zTarget = YIN_CAMERA_Z_BASE - Yin.scrollZoom * 0.85;
    T.camera.position.z +=
      (zTarget - T.camera.position.z) * (0.08 + dt * 4);
    T.camera.position.x = Yin.mouseSm.x * 0.055;
    T.camera.position.y = Yin.mouseSm.y * 0.055 * 0.92;
    T.camera.lookAt(Yin.scene.position);

    if (Yin.particlesRoot)
      Yin.particlesRoot.rotation.z += YIN_SLOW_SPIN * dt;

    var geom = Yin.geom;
    if (geom && Yin.basePos && Yin.vel) {
      var arr = geom.attributes.position.array;
      var mx = _mouseWorld.x;
      var my = _mouseWorld.y;
      var thSpin = Yin.particlesRoot ? Yin.particlesRoot.rotation.z : 0;
      var cs = Math.cos(thSpin);
      var sn = Math.sin(thSpin);
      var mxLoc = mx * cs + my * sn;
      var myLoc = -mx * sn + my * cs;
      var mi = 1.35;
      var pushRadiusSq = 0.25 * WORLD_SCALE * WORLD_SCALE;
      var repel = 4.2 * mi;
      var swirl = 2.4 * mi;
      var damp = Math.pow(0.965, dt * 60);

      for (var i = 0; i < arr.length; i += 3) {
        var bx = Yin.basePos[i];
        var by = Yin.basePos[i + 1];
        var bz = Yin.basePos[i + 2];
        var px = arr[i];
        var py = arr[i + 1];
        var pz = arr[i + 2];
        var dxm = px - mxLoc;
        var dym = py - myLoc;
        var distSq = dxm * dxm + dym * dym + 0.00008;
        var fx = 0;
        var fy = 0;
        var fz = 0;

        if (Yin.pointerRepelActive && distSq < pushRadiusSq) {
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
        var curl = 0.029 * mi;
        fx += c.x * curl;
        fy += c.y * curl;

        fx += (bx - px) * 6.05;
        fy += (by - py) * 6.05;
        fz +=
          (bz + 0.014 * Math.sin(t * 1.8 + bx * 5 + by * 3) - pz) *
          (6.05 * 0.68);

        var evsEy = Yin.eyeVoids;
        var pxySq = px * px + py * py;
        var omSq = Yin.omGuardSq;
        if (evsEy && evsEy.length && (!omSq || pxySq >= omSq)) {
          var eLi;
          for (eLi = 0; eLi < evsEy.length; eLi++) {
            var exEye = px - evsEy[eLi].cx;
            var eyEye = py - evsEy[eLi].cy;
            var ezSqEye = exEye * exEye + eyEye * eyEye + 1e-11;
            if (ezSqEye < evsEy[eLi].rsq) {
              var distEye = Math.sqrt(ezSqEye);
              var rCap = Math.sqrt(evsEy[eLi].rsq);
              var penEye = Math.max(0, rCap - distEye + 3e-3);
              var kPush = 58 * mi * WORLD_SCALE * 0.62 * 0.72;
              var fac = penEye / (distEye + 9e-4);
              fx += exEye * kPush * fac;
              fy += eyEye * kPush * fac;
            }
          }
        }

        Yin.vel[i] = (Yin.vel[i] + fx * dt) * damp;
        Yin.vel[i + 1] = (Yin.vel[i + 1] + fy * dt) * damp;
        Yin.vel[i + 2] = (Yin.vel[i + 2] + fz * dt) * damp;
        arr[i] += Yin.vel[i];
        arr[i + 1] += Yin.vel[i + 1];
        arr[i + 2] += Yin.vel[i + 2];
        px = arr[i];
        py = arr[i + 1];
        pxySq = px * px + py * py;
        omSq = Yin.omGuardSq;
        evsEy = Yin.eyeVoids;
        if (evsEy && evsEy.length && (!omSq || pxySq >= omSq)) {
          for (
            var ej = 0;
            ej < evsEy.length;
            ej++
          ) {
            var ixE = px - evsEy[ej].cx;
            var iyE = py - evsEy[ej].cy;
            var sE = ixE * ixE + iyE * iyE;
            if (
              sE > 1e-14 &&
              sE < evsEy[ej].rsq
            ) {
              var kR = Math.sqrt(evsEy[ej].rsq / sE);
              arr[i] = px = evsEy[ej].cx + ixE * kR;
              arr[i + 1] = py = evsEy[ej].cy + iyE * kR;
            }
          }
        }
      }
      geom.attributes.position.needsUpdate = true;
    }

    Yin.renderer.render(Yin.scene, T.camera);
  }

  function bindPointerAndWheel() {
    function onPointer(e) {
      Yin.pointerRepelActive = true;
      Yin.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      Yin.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener(
      'wheel',
      function (e) {
        Yin.scrollZoom += e.deltaY * 0.00055;
        Yin.scrollZoom = clamp(Yin.scrollZoom, -0.9, 1.2);
      },
      { passive: true }
    );
  }

  function neonMaskPageUrl(particles) {
    var path = assetRoot + 'yin-yang-neon-mask/index.html';
    var href = path;
    try {
      href = new URL(path, window.location.href).href;
    } catch (_z) {}
    return href + '#particles=' + particles;
  }

  function startYinYangEngine(onReady) {
    teardownYinScene();

    landingLoadProgress(38);

    dom.canvas =
      document.querySelector('#landing-root .ui canvas') ||
      document.querySelector('canvas');
    if (!THREE) {
      landingLoadProgress(100);
      if (onReady) onReady();
      return;
    }

    if (dom.canvas) dom.canvas.style.display = 'none';

    function finishYinLoaded() {
      landingLoadProgress(72);
      var jfr = document.getElementById('pm-julia-backdrop-iframe');
      var nfr = document.getElementById('pm-neon-backdrop-iframe');
      var need = 0;
      if (jfr) need++;
      if (nfr) need++;
      var finalized = false;
      function finalize() {
        if (finalized) return;
        finalized = true;
        landingLoadProgress(94);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            window.setTimeout(function () {
              landingLoadProgress(100);
              if (onReady) onReady();
            }, 100);
          });
        });
      }
      window.setTimeout(function () {
        if (!finalized) finalize();
      }, 9000);
      if (need === 0) {
        finalize();
        return;
      }
      var left = need;
      function oneReady() {
        left--;
        if (left <= 0) finalize();
      }
      function arm(ifr) {
        if (!ifr) {
          oneReady();
          return;
        }
        var done = false;
        function fin() {
          if (done) return;
          done = true;
          oneReady();
        }
      window.setTimeout(fin, 6000);
        try {
          var d = ifr.contentDocument;
          if (d && d.readyState === 'complete') {
            fin();
            return;
          }
        } catch (_doc) {}
        try {
          ifr.addEventListener('load', fin);
        } catch (_e) {}
      }
      arm(jfr);
      arm(nfr);
    }

    /* Stub camera for GSAP (arrow navigation / portal zoom) — WebGL runs inside neon iframe */
    var cameraStub = new THREE.PerspectiveCamera(YIN_CAMERA_FOV, 1, 0.01, 100);
    cameraStub.position.z = YIN_CAMERA_Z_BASE;
    T.camera = cameraStub;

    landingLoadProgress(50);

    function onNeonHostResize() {
      resizeMenu(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onNeonHostResize);
    onNeonHostResize();

    var box = dom.iframeBox || document.querySelector('#landing-root .iframe-container');
    if (box) {
      var neonHostEarly = document.getElementById('pm-neon-backdrop');
      var juliaWrap = document.getElementById('pm-julia-backdrop');
      if (!juliaWrap) {
        juliaWrap = document.createElement('div');
        juliaWrap.id = 'pm-julia-backdrop';
        juliaWrap.style.cssText =
          'position:absolute;left:0;top:0;right:0;bottom:0;width:100%;height:100%;min-height:100%;z-index:0;overflow:hidden;pointer-events:none;';
        var jfr = document.createElement('iframe');
        jfr.id = 'pm-julia-backdrop-iframe';
        jfr.title = 'Julia fractal backdrop';
        jfr.setAttribute('aria-hidden', 'true');
        jfr.setAttribute('loading', 'eager');
        jfr.referrerPolicy = 'same-origin';
        jfr.src = assetRoot + 'julia-fractal-backdrop/index.html';
        jfr.style.cssText =
          'width:100%;height:100%;min-height:100%;border:0;display:block;vertical-align:top;';
        var juliaHue = document.createElement('div');
        juliaHue.id = 'pm-julia-backdrop-hue';
        juliaHue.setAttribute('aria-hidden', 'true');
        juliaHue.style.cssText =
          'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;background:rgba(22,12,48,0.52);';
        juliaWrap.appendChild(jfr);
        juliaWrap.appendChild(juliaHue);
        if (neonHostEarly) box.insertBefore(juliaWrap, neonHostEarly);
        else box.insertBefore(juliaWrap, box.firstChild);
      }

      var n = particleCountForTier();
      var neonSrc = neonMaskPageUrl(n);
      var wrap = document.getElementById('pm-neon-backdrop');
      var fr;
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'pm-neon-backdrop';
        wrap.style.cssText =
          'position:absolute;left:0;top:0;right:0;bottom:0;width:100%;height:100%;min-height:100%;z-index:1;overflow:hidden;pointer-events:auto;';
        fr = document.createElement('iframe');
        fr.id = 'pm-neon-backdrop-iframe';
        fr.title = 'Neon Yin Yang background';
        fr.setAttribute('aria-hidden', 'true');
        fr.setAttribute('loading', 'eager');
        fr.referrerPolicy = 'same-origin';
        fr.src = neonSrc;
        fr.style.cssText =
          'width:100%;height:100%;min-height:100%;border:0;display:block;vertical-align:top;';
        wrap.appendChild(fr);
        box.insertBefore(wrap, box.firstChild);
      } else {
        fr = document.getElementById('pm-neon-backdrop-iframe');
        if (fr) fr.src = neonSrc;
        wrap.style.zIndex = '1';
      }
    }

    landingLoadProgress(62);
    finishYinLoaded();
  }

  /** ── Overlay shell (ex-module 53) ── */

  function syncDemoChrome() {
    var e = DemoList[DemoIndex];
    if (!e || !dom.arrows || dom.arrows.length < 2) return;
    dom.arrows[0].classList.toggle('is-active', DemoIndex > 0);
    dom.arrows[1].classList.toggle('is-active', DemoIndex < DemoList.length - 1);
    if (dom.iframeBox && e) dom.iframeBox.style.backgroundColor = e.bgColor;
    var t = e.colors;
    for (var n = 0; n < 4; n++) {
      if (A['color' + (n + 1)] && typeof A['color' + (n + 1)].setHex === 'function')
        A['color' + (n + 1)].setHex(t[n]);
    }
    var speeds = e.speeds;
    M.to(T, 2, { speed: speeds[0], ease: 'linear' });
    M.to(T, 2, { curlSize: speeds[1], ease: 'linear' });
    M.to(T, 2, { particlesOuterSpeed: speeds[2], ease: 'linear' });
    M.to(T, 2, { particlesEmittingSpeed: speeds[3], ease: 'linear' });
    M.to(T, 2, { particlesEmittingStrength: speeds[4], ease: 'linear' });
    M.to(T, 2, { particlesEmittingFriction: speeds[5], ease: 'linear' });
  }

  function preload(startEngineCallback) {
    G = startEngineCallback;
    quickLoaderStart(function () {
      openingQualityPhase();
    });
  }

  function openingQualityPhase() {
    dom.body = document.body;
    dom.canvas =
      document.querySelector('#landing-root .ui canvas') ||
      document.querySelector('canvas');
    dom.ui = document.querySelector('.ui');
    dom.logo = document.querySelector('#landing-root .logo') || document.querySelector('.logo');
    if (!dom.logo) return;
    dom.logo.addEventListener('click', function () {});

    dom.qualitySel = document.querySelector('.quality-selector');
    dom.qualityTitle = document.querySelector('.quality-title');
    dom.qualityBtns = document.querySelectorAll('.quality-btn');
    dom.menu = document.querySelector('.menu');
    dom.iframeBox = document.querySelector('.iframe-container');
    dom.titlesWrap = document.querySelector('.titles-container');
    dom.titlesMove = document.querySelector('.titles-move-container');
    dom.goBtn = document.querySelector('.go-btn');
    dom.goSpinner = document.querySelector('.go-btn-bg-spinner');
    dom.arrows = document.querySelectorAll('.arrow');
    dom.closeBtn = document.querySelector('.close-btn');

    if (dom.titlesMove && DemoList && DemoList.length)
      dom.titlesMove.style.width = 320 * DemoList.length + 'px';

    var i;
    for (i = 0; i < dom.qualityBtns.length; i++) {
      dom.qualityBtns[i].quality = i;
      dom.qualityBtns[i].addEventListener('click', onQualityChosen);
    }

    dom.qualitySel.style.display = 'block';
    landingLoadProgress(18);
    M.set(dom.logo, {
      y: 0.5 * window.innerHeight - dom.logo.offsetTop - 0.5 * dom.logo.offsetHeight,
      force3D: true,
      opacity: 0
    });
    M.to(dom.logo, 1.5, { delay: 0.5, opacity: 1 });
    M.to(dom.qualityTitle, 1, { delay: 2.5, opacity: 1 });
    for (i = 0; i < dom.qualityBtns.length; i++) {
      var qb = dom.qualityBtns[i];
      M.set(qb, { opacity: 0, scale: 0.001, force3D: true });
      M.to(qb, 0.5, { delay: 2.6 + 0.1 * i, opacity: 1 });
      M.to(qb, 1, {
        delay: 2.6 + 0.1 * i,
        scale: 1,
        force3D: true,
        ease: 'easeOutBack'
      });
    }
    M.delayedCall(3, function () {
      dom.qualitySel.style.pointerEvents = 'auto';
      dom.logo.style.cursor = 'pointer';
      dom.logo.style.pointerEvents = 'auto';
    });
    /* Auto-pick Low after handlers exist — avoids racing the landing_bridge setTimeout. */
    M.delayedCall(0.12, function () {
      if (!dom.qualityBtns || !dom.qualityBtns.length) return;
      try {
        dom.qualityBtns[0].click();
      } catch (_autoQ) {}
    });
  }

  function onQualityChosen() {
    landingLoadProgress(32);
    dom.qualitySel.style.pointerEvents = 'none';
    T.quality = this.quality;

    var q = this.quality;
    if (q === 0) {
      T.motionBlur = false;
      T.particlesMotionTextureWidth = 256;
      T.particlesMotionTextureHeight = 256;
      A.size = 3;
    } else if (q === 1) {
      R.motionRenderTargetScale = 0.5;
      R.maxDistance = 60;
      T.particlesMotionTextureWidth = 256;
      T.particlesMotionTextureHeight = 256;
      A.size = 2.5;
    } else if (q === 2) {
      T.particlesMotionTextureWidth = 512;
      T.particlesMotionTextureHeight = 512;
      R.useDithering = false;
      R.useFloatLinear = true;
      A.size = 2;
    }

    M.to(dom.qualityTitle, 1, { opacity: 0 });
    var r;
    for (r = 0; r < dom.qualityBtns.length; r++) {
      var active = q === r ? 0.25 : 0;
      var b = dom.qualityBtns[r];
      M.to(b, 0.4, { delay: 0.4 + active, opacity: 0 });
      M.to(b, 0.8, {
        delay: active,
        scale: 1e-4,
        force3D: true,
        ease: 'easeInBack'
      });
    }
    M.delayedCall(1.5, function () {
      dom.qualitySel.style.display = 'none';
      if (G) G();
    });
  }

  function initTitlesAndMenuPhase() {
    if (!DemoList || !DemoList.length) return;
    var n;
    for (n = 0; n < DemoList.length; n++) {
      var d = document.createElement('div');
      d.innerHTML = DemoList[n].title;
      dom.titlesMove.appendChild(d);
    }

    var o;
    for (n = 0; n < dom.arrows.length; n++) {
      o = dom.arrows[n];
      o.addEventListener('click', onArrowNavigate);
    }
    dom.goBtn.addEventListener('click', onGoEnterPortal);
    dom.goBtn.addEventListener('mouseenter', onGoSpinnerHover);
    dom.closeBtn.addEventListener('click', onCloseIframe);

    syncDemoChrome();
    M.set(dom.titlesWrap, { opacity: 0 });
    M.to(dom.titlesWrap, 1, {
      delay: 3.5,
      opacity: 1,
      onComplete: showHeroMenuTween
    });
    M.to(I, 2.5, {
      blurRadius: 2.5,
      amount: 1,
      ease: 'linear',
      onUpdate: function () {
        syncIBlurToUi(dom.ui);
      }
    });
  }

  function showHeroMenuTween() {
    dom.menu.style.display = 'block';
    if (dom.logo && M) {
      M.to(dom.logo, 1, {
        y: 0,
        force3D: true,
        ease: 'easeInOutQuint',
      });
    }
    M.set(dom.arrows[0], { x: 136, force3D: true, opacity: 0 });
    M.to(dom.arrows[0], 0.8, {
      x: 0,
      force3D: true,
      opacity: 1,
      ease: 'easeInOutQuint'
    });
    M.set(dom.arrows[1], { x: -136, force3D: true, opacity: 0 });
    M.to(dom.arrows[1], 0.8, {
      x: 0,
      force3D: true,
      opacity: 1,
      ease: 'easeInOutQuint'
    });
    M.set(dom.goBtn, { scale: 0.001, force3D: true, opacity: 0 });
    M.to(dom.goBtn, 0.5, { opacity: 1 });
    M.to(dom.goBtn, 0.8, {
      scale: 1,
      force3D: true,
      ease: 'easeOutBack'
    });
  }

  function hideHeroMenuTween(done) {
    M.to(dom.arrows[0], 0.8, {
      x: 136,
      force3D: true,
      opacity: 0,
      ease: 'easeInOutQuint'
    });
    M.to(dom.arrows[1], 0.8, {
      x: -136,
      force3D: true,
      opacity: 0,
      ease: 'easeInOutQuint'
    });
    M.to(dom.goBtn, 0.5, { opacity: 0 });
    M.to(dom.goBtn, 0.8, {
      scale: 1e-4,
      force3D: true,
      ease: 'easeInBack',
      onComplete: function () {
        dom.menu.style.display = 'none';
        if (done) done();
      }
    });
  }

  function onGoSpinnerHover(ev) {
    if (!dom.goSpinner) return;
    var t =
      Math.atan2(-(ev.pageY - 0.5 * window.innerHeight), ev.pageX - 0.5 * window.innerWidth) +
      4 * Math.PI;
    t = 3 - (((t / Math.PI) * 2 - 0.25) >> 0) % 4;
    dom.goSpinner.style.transform = 'rotateZ(' + 90 * t + 'deg)';
  }

  function onGoEnterPortal() {
    var sel = document.getElementById('pm-demo-select');
    if (sel) DemoIndex = clamp(parseInt(sel.value, 10) || 0, 0, DemoList.length - 1);
    enterPortalIframe(DemoList[DemoIndex]);
  }

  function onArrowNavigate() {
    var dir = this.classList.contains('is-left') ? -1 : 1;
    var next = clamp(DemoIndex + dir, 0, DemoList.length - 1);
    if (next === DemoIndex) return;
    var dn = next - DemoIndex;
    DemoIndex = next;
    syncDemoChrome();
    M.to(dom.titlesMove, 0.5 + 0.2 * Math.abs(dn), {
      x: 320 * -DemoIndex,
      force3D: true,
      ease: 'easeOutQuint'
    });
    var r = (850 + 350 * Math.random()) * WORLD_SCALE;
    var o = (0.5 * Math.random() + 0.75) * Math.PI;
    var iang = -(0.25 * Math.random() + 0.5) * Math.PI;
    camOrbitScratch.set(
      r * Math.cos(iang) * Math.cos(o),
      r * Math.sin(o),
      r * Math.sin(iang) * Math.cos(o)
    );
    var a = T.camera.position.distanceTo(camOrbitScratch);
    M.to(T.camera.position, 1.5 + a / 1000, {
      x: camOrbitScratch.x,
      y: camOrbitScratch.y,
      z: camOrbitScratch.z,
      ease: 'easeInOutQuint'
    });
  }

  function onCloseIframe() {
    if (!iframeRef) return;
    leavePortalIframeBack();
  }

  function destroyIframeSafe() {
    if (iframeRef && iframeRef.parentNode) iframeRef.parentNode.removeChild(iframeRef);
    iframeRef = null;
  }

  function enterPortalIframe(ev) {
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        return;
      }
    } catch (_emb) {
      return;
    }
    dom.body.style.pointerEvents = 'none';
    dom.menu.style.pointerEvents = 'none';
    destroyIframeSafe();
    M.set(I, { ratio: 0 });

    hideHeroMenuTween(undefined);

    dom.closeBtn.style.display = 'block';
    M.set(dom.closeBtn, { scale: 0.001, force3D: true, opacity: 0 });
    M.to(dom.closeBtn, 0.5, { opacity: 1 });
    M.to(dom.closeBtn, 0.8, {
      scale: 1,
      force3D: true,
      ease: 'easeOutBack'
    });
    if (T.isMobile) {
      dom.logo.style.pointerEvents = 'none';
      M.to(dom.logo, 0.8, {
        scale: 0.001,
        force3D: true,
        ease: 'easeInBack',
        onComplete: function () {
          dom.logo.style.display = 'none';
        }
      });
    }

    camOrbitScratch.copy(T.camera.position).normalize().multiplyScalar(100 * WORLD_SCALE);
    M.to(T.camera.position, 1, {
      x: camOrbitScratch.x,
      y: camOrbitScratch.y,
      z: camOrbitScratch.z,
      ease: 'easeOutSine'
    });
    M.to(dom.titlesWrap, 0.5, { opacity: 0 });

    Yin.paused = true;
    M.to(I, 1, {
      ratio: 1,
      blurRadius: 5,
      amount: 10,
      ease: 'easeInOutCubic',
      onUpdate: function () {
        syncIBlurToUi(dom.ui);
      },
      onComplete: function () {
        if (dom.canvas) dom.canvas.style.display = 'none';
        dom.body.style.pointerEvents = 'auto';
        T.skipRendering = true;
        iframeRef = document.createElement('iframe');
        dom.iframeBox.appendChild(iframeRef);
        iframeRef.src = ev.urls[T.qualityList[T.quality]];
        iframeRef.style.backgroundColor = ev.bgColor;
        try {
          iframeRef.focus();
        } catch (_) {}
        dom.closeBtn.style.display = 'block';
      }
    });
  }

  function leavePortalIframeBack() {
    if (!dom.canvas) return;
    dom.canvas.style.display = 'none';
    dom.body.style.pointerEvents = 'none';
    T.skipRendering = false;
    Yin.paused = false;

    destroyIframeSafe();

    showHeroMenuTween();

    M.to(dom.closeBtn, 0.5, { opacity: 0 });
    M.to(dom.closeBtn, 0.8, {
      scale: 0.001,
      force3D: true,
      ease: 'easeInBack',
      onComplete: function () {
        dom.closeBtn.style.display = 'none';
      }
    });

    if (T.isMobile) {
      dom.logo.style.pointerEvents = 'auto';
      dom.logo.style.display = 'block';
      M.to(dom.logo, 0.8, { scale: 1, force3D: true, ease: 'easeOutBack' });
    }

    camOrbitScratch.copy(T.camera.position).normalize().multiplyScalar(1000 * WORLD_SCALE);
    M.to(dom.titlesWrap, 0.5, { opacity: 1 });
    M.to(T.camera.position, 1, {
      x: camOrbitScratch.x,
      y: camOrbitScratch.y,
      z: camOrbitScratch.z,
      ease: 'easeOutBack'
    });

    M.to(I, 1, {
      ratio: 0,
      blurRadius: 2.5,
      amount: 1,
      ease: 'easeOutQuint',
      onUpdate: function () {
        syncIBlurToUi(dom.ui);
      },
      onComplete: function () {
        if (dom.ui) dom.ui.style.filter = '';
        dom.body.style.pointerEvents = 'auto';
        dom.menu.style.pointerEvents = 'auto';
      }
    });
  }

  function resizeMenu(innerW, innerH) {
    if (dom.menu) dom.menu.style.top = ~~(0.5 * innerH) + 'px';
  }

  /** Public façade (prior bundle's module 53) */
  window.__particleMadnessPickDemo = function (idx) {
    if (!DemoList || !DemoList.length) return;
    DemoIndex = clamp(idx | 0, 0, DemoList.length - 1);
    var t = document.getElementById('pm-demo-select');
    if (t) t.value = String(DemoIndex);
    syncDemoChrome();
    if (dom.titlesMove && typeof M !== 'undefined') {
      M.to(dom.titlesMove, 0.5, {
        x: 320 * -DemoIndex,
        force3D: true,
        ease: 'easeOutQuint'
      });
    }
  };

  var LandingCtl = {
    preload: preload,
    init: initTitlesAndMenuPhase,
    resize: function (iw, ih) {
      resizeMenu(iw, ih);
      if (!Yin.renderer || !T.camera) return;
      T.camera.aspect = iw / ih;
      T.camera.updateProjectionMatrix();
      Yin.renderer.setSize(iw, ih, true);
    }
  };

  LandingCtl.preload(function engineStart() {
    startYinYangEngine(function () {
      LandingCtl.init();
    });
  });
})();
