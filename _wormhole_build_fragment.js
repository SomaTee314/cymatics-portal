    /* ── Julia wormhole: Wormhole.zip parity (framed Julia sky + disk Julia rings + helices + Om sprites), audio-driven depth ── */
    var wormholeGui = null;
    var wormholeRoot = null;
    var wormholeSceneBuilt = false;
    var whDepth = 0;
    var whPrevDepth = 0;
    var whVelocitySm = 0;
    var wormholeFramedSkyMat = null;
    var wormholeFramedSky = null;
    var wormholeRingMeshes = [];
    var wormholeRingMats = [];
    var wormholeHelixMeshes = [];
    var wormholeOmGroup = null;
    var wormholeOmSprites = [];
    var wormholeOmSharedMat = null;
    var wormholeFogBk = null;

    /** Mirrors `_wormhole_extract/Wormhole/src/tunnel/tunnelStore.ts` TUNNEL_INITIAL + audio tuning */
    var wormholeControls = {
        audioLevelFly: 1.35,
        audioTransientFly: 1.05,
        audioBassFly: 0.62,
        audioSensitivity: 0.0015,
        idleForwardAudioMul: 1,
        idleForward: 1.0,
        scrollCoastTau: 60,
        scrollFriction: 0.92,
        juliaCx: -0.7269,
        juliaCy: 0.1889,
        helixFlareGain: 1.0,
        juliaFrameZoom: 1.5,
        juliaPulseAmount: 0.1,
        juliaParallaxAmount: 0.04,
        juliaRotationSpeed: 0.085,
        juliaRidgeStrength: 0.09,
        juliaPulseSpeed: 0.4,
        omStreamSpeed: 0.05,
        fractalEvolutionSpeed: 3.0,
        discRadius: 0.24,
        ringRadius: 8,
        ringSpacing: 4,
        ringCount: 72,
        helixCount: 3,
        wormParticleCount: 2400,
        fogDensity: 0.02,
        ringIntensity: 1.0,
        skyIntensity: 1.05,
        /** dat.GUI addColor — same pattern as Advanced Visual Controls `palette` (hex strings). */
        whColorSky: '#ffffff',
        whColorRing: '#ffffff',
        whColorHelix: '#ff4da8',
        whColorOm: '#ffffff',
        /** Neutral/white → technicolor Julia (Wormhole.zip); saturated chroma → monochrome gradient on sky + ring shaders. */
        whJuliaFractColor: '#ffffff'
    };

    /**
     * Verbatim literals from `_wormhole_extract/Wormhole/src/components/ControlPanel.tsx` `JULIA_PRESETS`.
     * Keys mirror portal `aggressionSel` (`juliaWH_<preset id>`). Only cx, cy, frameZoom applied on preset tap.
     */
    var JULIA_WH_PORTAL_PRESETS = {
        juliaWH_rabbit: { cx: -0.7269, cy: 0.1889, frameZoom: 1.5 },
        juliaWH_dendrite: { cx: 0, cy: 1, frameZoom: 1.5 },
        juliaWH_sanMarco: { cx: -0.75, cy: 0, frameZoom: 1.5 },
        juliaWH_siegel: { cx: -0.391, cy: -0.587, frameZoom: 1.5 },
        juliaWH_recursive: { cx: -0.8, cy: 0.156, frameZoom: 1.5 },
        juliaWH_spiral: { cx: -0.4, cy: 0.6, frameZoom: 1.5 },
        juliaWH_airplane: { cx: -1.755, cy: 0, frameZoom: 1.5 },
        juliaWH_cauliflower: { cx: 0.285, cy: 0.01, frameZoom: 1.5 }
    };

    /** Readout suffix after `Julia wormhole` (portal dropdown naming; Siegel = Disc per product copy). */
    var JULIA_WH_PORTAL_READOUT_SUFFIX = {
        juliaWH_rabbit: ' · Douady Rabbit',
        juliaWH_dendrite: ' · Dendrite',
        juliaWH_sanMarco: ' · San Marco',
        juliaWH_siegel: ' · Siegel Disc',
        juliaWH_recursive: ' · Deep Recursive',
        juliaWH_spiral: ' · Spiral',
        juliaWH_airplane: ' · Airplane',
        juliaWH_cauliflower: ' · Cauliflower'
    };

    function wormholeColorShiftGlsl() {
        return [
            'vec3 wh_rgb2hsv(vec3 c) {',
            '  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);',
            '  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));',
            '  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));',
            '  float d = q.x - min(q.w, q.y);',
            '  float e = 1.0e-10;',
            '  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);',
            '}',
            'vec3 wh_hsv2rgb(vec3 c) {',
            '  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);',
            '  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);',
            '  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);',
            '}',
            'vec3 wh_juliaFractColorize(vec3 palLin, vec3 pickRgb, float rainbowAmt) {',
            '  vec3 techno = palLin;',
            '  vec3 pick = clamp(pickRgb, vec3(1.0 / 2048.0), vec3(1.0));',
            '  vec3 pch = wh_rgb2hsv(pick);',
            '  float lum = clamp(dot(palLin, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);',
            '  float satk = pch.y * mix(0.22, 1.0, pow(lum + 0.015, 0.62));',
            '  float vk = clamp((0.04 + lum * (0.7 + 0.26 * pch.z)) * (0.85 + 0.15 / max(pch.z, 1.0 / 2048.0)), 0.02, 1.35);',
            '  vec3 mono = wh_hsv2rgb(vec3(pch.x, clamp(satk, 0.0, 1.0), vk));',
            '  return mix(mono, techno, rainbowAmt);',
            '}'
        ].join('\n');
    }

    /** Reused when reading wormhole colour pickers (dat.GUI addColor hex). */
    var _wormholePickCol = new THREE.Color();
    var _wormholePickHsl = { h: 0, s: 0, l: 0 };

    function wormholeColorFromPickerHex(hex) {
        var m = (hex && String(hex).replace(/^#/, '')) || 'ffffff';
        if (m.length === 3) {
            m = m.charAt(0) + m.charAt(0) + m.charAt(1) + m.charAt(1) + m.charAt(2) + m.charAt(2);
        }
        if (m.length !== 6 || /[^0-9a-f]/i.test(m)) {
            _wormholePickCol.setRGB(1, 1, 1);
            return _wormholePickCol;
        }
        _wormholePickCol.setRGB(
            parseInt(m.slice(0, 2), 16) / 255,
            parseInt(m.slice(2, 4), 16) / 255,
            parseInt(m.slice(4, 6), 16) / 255
        );
        return _wormholePickCol;
    }

    var _julFractPickRgb = new THREE.Vector3(1, 1, 1);

    /** 1 = legacy technicolor cosine; 0 = monochromatic gradient from pickRgb (chromatic picks only). */
    function wormholeJuliaFractRainbowAmtLoaded() {
        var rr = _wormholePickCol.r;
        var gg = _wormholePickCol.g;
        var bb = _wormholePickCol.b;
        var mx = Math.max(rr, Math.max(gg, bb));
        var mn = Math.min(rr, Math.min(gg, bb));
        if (mx - mn < 0.035) return 1;
        var lumRecip = mx > 1e-5 ? mn / mx : 0;
        if (lumRecip < 0.048 && mn < 0.025 && mx > 0.12) return 1;
        return 0;
    }

    function wormholeApplyJuliaFractColourUniforms() {
        wormholeColorFromPickerHex(wormholeControls.whJuliaFractColor || '#ffffff');
        var rBow = wormholeJuliaFractRainbowAmtLoaded();
        _julFractPickRgb.set(_wormholePickCol.r, _wormholePickCol.g, _wormholePickCol.b);
        if (wormholeFramedSkyMat && wormholeFramedSkyMat.uniforms.uJuliaPickRgb) {
            wormholeFramedSkyMat.uniforms.uJuliaPickRgb.value.copy(_julFractPickRgb);
            wormholeFramedSkyMat.uniforms.uJuliaRainbow.value = rBow;
        }
        var ri;
        for (ri = 0; ri < wormholeRingMats.length; ri++) {
            var mat = wormholeRingMats[ri];
            if (mat.uniforms.uJuliaPickRgb) {
                mat.uniforms.uJuliaPickRgb.value.copy(_julFractPickRgb);
                mat.uniforms.uJuliaRainbow.value = rBow;
            }
        }
    }

    function wormholeApplyPickerColorsToShaders() {
        wormholeApplyJuliaFractColourUniforms();
    }

    function whNormHue01(v) {
        v = ((v % 1) + 1) % 1;
        return v;
    }

    var wormholeOmLoadGen = 0;
    var wormholeOmSceneBuildId = 0;

    function wormholeTunnelLength() {
        var s = wormholeControls;
        return Math.max(1, s.ringCount * s.ringSpacing);
    }

    function wormholeIsReducedMotion() {
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (eRm) {
            return false;
        }
    }

    function wormholeIsMobileClamp() {
        try {
            return (
                window.matchMedia('(pointer: coarse)').matches &&
                window.matchMedia('(hover: none)').matches
            );
        } catch (eM) {
            return false;
        }
    }

    /** Verbatim ring Julia shaders from `juliaWormholeShaders.ts` */
    function wormholeRingVertexGlsl() {
        return [
            'varying vec2 vUv;',
            'void main() {',
            '  vUv = uv;',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
        ].join('\n');
    }

    function wormholeRingFragmentGlsl() {
        return [
            'precision highp float;',
            'varying vec2 vUv;',
            'uniform float uTime;',
            'uniform float uDepth;',
            'uniform float uIndex;',
            'uniform float uZoom;',
            'uniform float uIntensity;',
            'uniform vec2 uCenter;',
            'uniform float uDiscRadius;',
            'uniform float uMode;',
            'uniform float uFractalEvolutionSpeed;',
            'uniform vec3 uJuliaPickRgb;',
            'uniform float uJuliaRainbow;',
            wormholeColorShiftGlsl(),
            'vec3 palette(float t) {',
            '  vec3 a = vec3(0.5);',
            '  vec3 b = vec3(0.55);',
            '  vec3 c = vec3(1.0);',
            '  vec3 d = vec3(0.00, 0.33, 0.67);',
            '  return a + b * cos(6.28318530718 * (c * t + d));',
            '}',
            'void main() {',
            '  vec2 p = (vUv - 0.5) * 2.0;',
            '  vec2 z0 = p / max(uZoom, 1e-3);',
            '  float dEv = uDepth * uFractalEvolutionSpeed;',
            '  float ph1 = uTime * 0.13 + uIndex * 0.7 + dEv * 0.15;',
            '  float ph2 = uTime * 0.17 + uIndex * 1.1 + dEv * 0.13;',
            '  vec2 c = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));',
            '  const int MAX_ITERS = 96;',
            '  const float B = 64.0;',
            '  vec2 z = z0;',
            '  float m2 = dot(z, z);',
            '  float n = 0.0;',
            '  for (int i = 0; i < MAX_ITERS; i++) {',
            '    if (m2 > B * B) break;',
            '    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;',
            '    m2 = dot(z, z);',
            '    n += 1.0;',
            '  }',
            '  float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;',
            '  float tRaw = 0.04 * sn + 0.06 * dEv + uIndex * 0.07;',
            '  float paletteT = clamp(fract(tRaw), 0.001, 0.999);',
            '  vec3 pal = palette(paletteT);',
            '  vec3 col = wh_juliaFractColorize(pal, uJuliaPickRgb, uJuliaRainbow);',
            '  float escaped = step(B * B, m2);',
            '  col *= mix(0.14, 1.1, escaped);',
            '  col = 1.0 - exp(-col * uIntensity);',
            '  float alpha = 1.0;',
            '  if (uMode < 0.5) {',
            '    float edgeFade = smoothstep(0.05, 0.35, abs(p.y));',
            '    alpha = edgeFade;',
            '  }',
            '  gl_FragColor = vec4(col, alpha);',
            '}'
        ].join('\n');
    }

    /** Verbatim framed sky from `framedSkyShader.ts` */
    function wormholeFramedSkyVertexGlsl() {
        return [
            'varying vec2 vUv;',
            'void main() {',
            '  vUv = position.xy * 0.5 + 0.5;',
            '  gl_Position = vec4(position.xy, 0.999, 1.0);',
            '}'
        ].join('\n');
    }

    function wormholeFramedSkyFragmentGlsl() {
        return [
            'precision highp float;',
            'varying vec2 vUv;',
            'uniform float uTime;',
            'uniform float uDepth;',
            'uniform float uZoom;',
            'uniform float uIntensity;',
            'uniform vec2 uCenter;',
            'uniform float uDiscRadius;',
            'uniform vec2 uResolution;',
            'uniform float uPulseAmount;',
            'uniform float uPulseSpeed;',
            'uniform float uParallaxAmount;',
            'uniform float uRotationSpeed;',
            'uniform float uRidgeStrength;',
            'uniform float uFractalEvolutionSpeed;',
            'uniform vec3 uJuliaPickRgb;',
            'uniform float uJuliaRainbow;',
            wormholeColorShiftGlsl(),
            'vec3 palette(float t) {',
            '  vec3 a = vec3(0.5);',
            '  vec3 b = vec3(0.55);',
            '  vec3 c = vec3(1.0);',
            '  vec3 d = vec3(0.00, 0.33, 0.67);',
            '  return a + b * cos(6.28318530718 * (c * t + d));',
            '}',
            'float juliaAngleCont(float zx, float zy) {',
            '  float rh = length(vec2(zx, zy));',
            '  if (rh < 1e-7) return 0.0;',
            '  return 2.0 * atan(zy, zx + rh + 1e-7);',
            '}',
            'void main() {',
            '  vec2 p = (vUv - 0.5) * 2.0;',
            '  float aspect = uResolution.x / max(uResolution.y, 1.0);',
            '  if (aspect >= 1.0) p.x *= aspect;',
            '  else p.y /= aspect;',
            '  float dEv = uDepth * uFractalEvolutionSpeed;',
            '  float rot = uTime * uRotationSpeed + dEv * 0.03;',
            '  float cR = cos(rot);',
            '  float sR = sin(rot);',
            '  p = mat2(cR, -sR, sR, cR) * p;',
            '  float pulsePhasor = sin(uTime * uPulseSpeed);',
            '  float effectiveZoom = uZoom * (1.0 + pulsePhasor * uPulseAmount);',
            '  vec2 z0 = p / max(effectiveZoom, 1e-3);',
            '  float ph1 = uTime * 0.13 + dEv * 0.15;',
            '  float ph2 = uTime * 0.17 + dEv * 0.13;',
            '  vec2 c = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));',
            '  float parallaxAngle = uTime * 0.07 + dEv * 0.04;',
            '  c += vec2(cos(parallaxAngle), sin(parallaxAngle)) * pulsePhasor * uParallaxAmount;',
            '  const int MAX_ITERS = 384;',
            '  const float B = 256.0;',
            '  vec2 z = z0;',
            '  float m2 = dot(z, z);',
            '  float n = 0.0;',
            '  for (int i = 0; i < MAX_ITERS; i++) {',
            '    if (m2 > B * B) break;',
            '    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;',
            '    m2 = dot(z, z);',
            '    n += 1.0;',
            '  }',
            '  float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;',
            '  float escaped = step(B * B, m2);',
            '  float paletteOffset = uTime * 0.24 + dEv * 0.12;',
            '  float spiralPhase   = uTime * 0.18 + dEv * 0.10;',
            '  float r0  = length(z0);',
            '  float a0  = juliaAngleCont(z0.x, z0.y);',
            '  float lr0 = log(r0 + 1e-6);',
            '  float sprBackbone = lr0 * 0.48 + spiralPhase * 0.26 + paletteOffset * 0.07;',
            '  float sprWave = 0.036 * sin(2.0 * a0 + lr0 * 1.15 + spiralPhase * 0.85)',
            '                + 0.024 * sin(4.0 * a0 + paletteOffset * 2.1 + lr0 * 0.65);',
            '  float zr2  = max(m2, 1e-6);',
            '  float zang = juliaAngleCont(z.x, z.y);',
            '  float zlr  = log(zr2) * 0.5;',
            '  float sprOrbit = zlr * 0.13',
            '                 + 0.030 * sin(2.0 * zang + zlr * 0.9 + spiralPhase * 0.5)',
            '                 + 0.020 * cos(4.0 * zang + zlr * 0.45 + paletteOffset * 1.3);',
            '  float tLin = clamp(sn / float(MAX_ITERS), 0.0, 1.0);',
            '  float sprSum    = sprBackbone',
            '                  + uRidgeStrength * (sprWave + sprOrbit)',
            '                  + tLin * 0.1;',
            '  float spiralAcc = fract(sprSum);',
            '  float tRaw = clamp(0.3 * tLin + 0.7 * spiralAcc, 0.0, 0.98) * 3.0;',
            '  float paletteT = clamp(fract(tRaw), 0.001, 0.999);',
            '  vec3 pal = palette(paletteT);',
            '  vec3 col = wh_juliaFractColorize(pal, uJuliaPickRgb, uJuliaRainbow);',
            '  float nearEdge = (1.0 - tLin) * (1.0 - tLin);',
            '  col *= 1.0 + 0.22 * nearEdge;',
            '  col *= mix(0.04, 1.2, escaped);',
            '  col = 1.0 - exp(-col * uIntensity);',
            '  gl_FragColor = vec4(col, 1.0);',
            '}'
        ].join('\n');
    }

    function wormholeMakeRingMat(ringIndex) {
        var s = wormholeControls;
        var uZoom = 1.4 + (ringIndex % 5) * 0.12;
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDepth: { value: 0 },
                uIndex: { value: ringIndex },
                uZoom: { value: uZoom },
                uIntensity: { value: s.ringIntensity },
                uCenter: { value: new THREE.Vector2(s.juliaCx, s.juliaCy) },
                uDiscRadius: { value: s.discRadius },
                uMode: { value: 0 },
                uFractalEvolutionSpeed: { value: s.fractalEvolutionSpeed },
                uJuliaPickRgb: { value: new THREE.Vector3(1, 1, 1) },
                uJuliaRainbow: { value: 1 }
            },
            vertexShader: wormholeRingVertexGlsl(),
            fragmentShader: wormholeRingFragmentGlsl(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false
        });
    }

    function wormholeMakeFramedSkyMat() {
        var s = wormholeControls;
        var w = typeof window !== 'undefined' ? window.innerWidth : 800;
        var h = typeof window !== 'undefined' ? window.innerHeight : 600;
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDepth: { value: 0 },
                uZoom: { value: s.juliaFrameZoom },
                uIntensity: { value: s.skyIntensity },
                uCenter: { value: new THREE.Vector2(s.juliaCx, s.juliaCy) },
                uDiscRadius: { value: s.discRadius },
                uResolution: { value: new THREE.Vector2(w, h) },
                uPulseAmount: { value: s.juliaPulseAmount },
                uPulseSpeed: { value: s.juliaPulseSpeed },
                uParallaxAmount: { value: s.juliaParallaxAmount },
                uRotationSpeed: { value: s.juliaRotationSpeed },
                uRidgeStrength: { value: s.juliaRidgeStrength },
                uFractalEvolutionSpeed: { value: s.fractalEvolutionSpeed },
                uJuliaPickRgb: { value: new THREE.Vector3(1, 1, 1) },
                uJuliaRainbow: { value: 1 }
            },
            vertexShader: wormholeFramedSkyVertexGlsl(),
            fragmentShader: wormholeFramedSkyFragmentGlsl(),
            depthTest: false,
            depthWrite: false,
            fog: false
        });
    }

    function wormholeDisposeOmSprites() {
        var i;
        if (wormholeOmGroup && wormholeRoot) {
            wormholeRoot.remove(wormholeOmGroup);
        }
        for (i = 0; i < wormholeOmSprites.length; i++) {
            try {
                wormholeOmSprites[i].material = undefined;
            } catch (eO) {}
        }
        wormholeOmSprites = [];
        wormholeOmGroup = null;
        if (wormholeOmSharedMat) {
            try {
                if (wormholeOmSharedMat.map) wormholeOmSharedMat.map.dispose();
                wormholeOmSharedMat.dispose();
            } catch (eM2) {}
            wormholeOmSharedMat = null;
        }
    }

    function wormholeDisposeBuilt() {
        var i;
        wormholeDisposeOmSprites();
        if (wormholeRoot && scene) {
            scene.remove(wormholeRoot);
        }
        wormholeRoot = null;
        wormholeFramedSky = null;
        wormholeFramedSkyMat = null;
        for (i = 0; i < wormholeRingMeshes.length; i++) {
            try {
                wormholeRingMeshes[i].geometry.dispose();
                wormholeRingMeshes[i].material.dispose();
            } catch (eR) {}
        }
        wormholeRingMeshes = [];
        wormholeRingMats = [];
        for (i = 0; i < wormholeHelixMeshes.length; i++) {
            try {
                wormholeHelixMeshes[i].geometry.dispose();
                wormholeHelixMeshes[i].material.dispose();
            } catch (eH) {}
        }
        wormholeHelixMeshes = [];
        wormholeSceneBuilt = false;
    }

    function wormholeEnsureOmSprites(tunnelLen, ringRad, pc, loadGen) {
        wormholeDisposeOmSprites();
        wormholeOmGroup = new THREE.Group();
        wormholeRoot.add(wormholeOmGroup);

        var pPos = new Float32Array(pc * 3);
        var pPh = new Float32Array(pc);
        var pScale = new Float32Array(pc);
        var pj;
        for (pj = 0; pj < pc; pj++) {
            var theta = Math.random() * Math.PI * 2;
            var r = Math.sqrt(Math.random()) * ringRad * 0.95;
            var z = -Math.random() * tunnelLen;
            pPos[pj * 3] = Math.cos(theta) * r;
            pPos[pj * 3 + 1] = Math.sin(theta) * r;
            pPos[pj * 3 + 2] = z;
            pPh[pj] = Math.random() * Math.PI * 2;
            pScale[pj] = 0.6 + Math.random() * 0.8;
        }

        wormholeOmLoadGen++;
        var gen = wormholeOmLoadGen;
        var loader = new THREE.TextureLoader();
        loader.load(
            'om-neon.png',
            function (map) {
                if (
                    gen !== wormholeOmLoadGen ||
                    !wormholeRoot ||
                    loadGen !== wormholeRoot.userData._omLoadGen
                ) {
                    map.dispose();
                    return;
                }
                var aspect = map.image && map.image.height ? map.image.height / map.image.width : 1;
                var baseW = 0.24;
                wormholeOmSharedMat = new THREE.SpriteMaterial({
                    map: map,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    fog: true,
                    color: new THREE.Color().copy(wormholeColorFromPickerHex(wormholeControls.whColorOm))
                });
                var pi;
                for (pi = 0; pi < pc; pi++) {
                    var spr = new THREE.Sprite(wormholeOmSharedMat);
                    spr.position.set(pPos[pi * 3], pPos[pi * 3 + 1], pPos[pi * 3 + 2]);
                    spr.scale.set(baseW * pScale[pi], baseW * aspect * pScale[pi], 1);
                    spr.userData.phase = pPh[pi];
                    wormholeOmSprites.push(spr);
                    wormholeOmGroup.add(spr);
                }
            },
            undefined,
            function () {
                /* texture missing — tunnel still works without Om */
            }
        );
    }

    function wormholeEnsureScene() {
        if (wormholeSceneBuilt && wormholeRoot) return;
        wormholeDisposeBuilt();
        var mob = wormholeIsMobileClamp();
        var rm = wormholeIsReducedMotion();
        var s = wormholeControls;
        var rc = mob ? Math.min(s.ringCount, 24) : s.ringCount;
        var pc = mob ? Math.min(s.wormParticleCount, 650) : s.wormParticleCount;
        var tunnelLen = Math.max(1, rc * s.ringSpacing);
        var ringRad = s.ringRadius;
        var HELIX_PTS = mob ? 240 : 900;
        var HELIX_TWISTS = 6;

        wormholeRoot = new THREE.Object3D();
        wormholeRoot.visible = false;
        wormholeRoot.userData._rm = rm;
        wormholeRoot.userData._tunnelLength = tunnelLen;
        wormholeRoot.userData._particleCount = pc;
        wormholeRoot.userData._ringRad = ringRad;
        wormholeRoot.userData._omLoadGen = ++wormholeOmSceneBuildId;
        var omGen = wormholeRoot.userData._omLoadGen;

        wormholeFramedSkyMat = wormholeMakeFramedSkyMat();
        wormholeFramedSky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wormholeFramedSkyMat);
        wormholeFramedSky.frustumCulled = false;
        wormholeFramedSky.renderOrder = -1000;
        wormholeRoot.add(wormholeFramedSky);

        var ri;
        for (ri = 0; ri < rc; ri++) {
            var ringMat = wormholeMakeRingMat(ri);
            wormholeRingMats.push(ringMat);
            var ringGeo = new THREE.RingGeometry(ringRad * 0.81, ringRad, 80, 1);
            var ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.position.z = -ri * s.ringSpacing;
            ringMesh.rotation.z = (ri * 0.41) % (Math.PI * 2);
            ringMesh.userData.spin = 0.18 + (ri % 7) * 0.022;
            wormholeRingMeshes.push(ringMesh);
            wormholeRoot.add(ringMesh);
        }

        var hc;
        for (hc = 0; hc < s.helixCount; hc++) {
            var phaseOffset = (hc / s.helixCount) * Math.PI * 2;
            var pts = [];
            var hi2;
            for (hi2 = 0; hi2 <= HELIX_PTS; hi2++) {
                var t = hi2 / HELIX_PTS;
                var zh = -t * tunnelLen;
                var radH = ringRad * 0.78 + Math.sin(t * 18) * 0.4;
                var ang = phaseOffset + t * Math.PI * 2 * HELIX_TWISTS;
                pts.push(new THREE.Vector3(Math.cos(ang) * radH, Math.sin(ang) * radH, zh));
            }
            var curve = new THREE.CatmullRomCurve3(pts);
            var tubeGeoH = new THREE.TubeGeometry(curve, HELIX_PTS, 0.06, 8, false);
            var nh = Math.max(1, s.helixCount);
            wormholeColorFromPickerHex(s.whColorHelix);
            _wormholePickCol.getHSL(_wormholePickHsl);
            var helixS = Math.max(0.35, _wormholePickHsl.s);
            var helixL = Math.max(0.22, Math.min(0.62, _wormholePickHsl.l));
            var colH = new THREE.Color().setHSL(
                whNormHue01(_wormholePickHsl.h + hc / nh),
                helixS,
                helixL
            );
            var matH = new THREE.MeshBasicMaterial({
                color: colH,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: true
            });
            var meshH = new THREE.Mesh(tubeGeoH, matH);
            meshH.userData.basePhase = phaseOffset;
            meshH.userData.baseColor = colH.clone();
            wormholeHelixMeshes.push(meshH);
            wormholeRoot.add(meshH);
        }

        wormholeEnsureOmSprites(tunnelLen, ringRad, pc, omGen);

        scene.add(wormholeRoot);
        wormholeSceneBuilt = true;
        whPrevDepth = whDepth;
    }

    function wormholeTickAudio(dt, lvl, tr, snap) {
        var Bf = snap.bands || {};
        var bass = Bf.bass || 0;
        var sens = wormholeControls.audioSensitivity;
        var wheelAnalog =
            wormholeControls.audioLevelFly * lvl * 60000 +
            wormholeControls.audioTransientFly * Math.abs(tr || 0) * 90000 +
            wormholeControls.audioBassFly * bass * 40000;
        var impulse = wheelAnalog * sens * 0.35 * dt;
        var LOCKED_VEL_MAX = 140;
        whVelocitySm += impulse;
        if (whVelocitySm > LOCKED_VEL_MAX) whVelocitySm = LOCKED_VEL_MAX;
        if (whVelocitySm < -LOCKED_VEL_MAX) whVelocitySm = -LOCKED_VEL_MAX;

        var idleFwd =
            wormholeControls.idleForward *
            wormholeControls.idleForwardAudioMul *
            (typeof window.__audioStarted !== 'undefined' && window.__audioStarted ? 1 : 0.35);
        if (Math.abs(whVelocitySm) < 0.08 && idleFwd > 0) {
            whVelocitySm = idleFwd;
        }

        var coast = Math.exp(-dt / wormholeControls.scrollCoastTau);
        whVelocitySm *= coast;

        var friction = Math.pow(wormholeControls.scrollFriction, dt * 8);
        whVelocitySm *= friction;

        whDepth += whVelocitySm * dt;
        if (whDepth > 1e8) {
            var tl = wormholeTunnelLength();
            whDepth = whDepth % tl;
            whPrevDepth = whPrevDepth % tl;
        }
    }

    function wormholeApplySceneFog() {
        if (!(scene.fog instanceof THREE.FogExp2)) return;
        if (!wormholeFogBk) {
            wormholeFogBk = {
                c: scene.fog.color.clone(),
                d: scene.fog.density
            };
        }
        scene.fog.color.setHex(0x000000);
        scene.fog.density = wormholeControls.fogDensity;
    }

    function wormholeRestoreSceneFog() {
        if (!wormholeFogBk || !(scene.fog instanceof THREE.FogExp2)) return;
        scene.fog.color.copy(wormholeFogBk.c);
        scene.fog.density = wormholeFogBk.d;
    }

    function wormholeSyncFogFromControls() {
        if (visualMode !== 'juliaWormhole') return;
        wormholeApplySceneFog();
    }

    function wormholeTickVisual(dt, time, lvl, tr, snap) {
        if (!wormholeSceneBuilt || !wormholeRoot || !wormholeFramedSkyMat) return;
        var rm = !!wormholeRoot.userData._rm;
        var tunnelLen = wormholeRoot.userData._tunnelLength || wormholeTunnelLength();
        var ringRad = wormholeRoot.userData._ringRad || wormholeControls.ringRadius;
        var pc = wormholeRoot.userData._particleCount || 0;
        var s = wormholeControls;

        wormholeApplyPickerColorsToShaders();

        var dDepth = whDepth - whPrevDepth;
        whPrevDepth = whDepth;
        var OM_MAX_DEPTH_DELTA = tunnelLen * 3;
        var OM_DEPTH_TO_Z = 12;
        var dzOmBase =
            (!Number.isFinite(dDepth) || Math.abs(dDepth) > OM_MAX_DEPTH_DELTA
                ? whVelocitySm * dt
                : dDepth) * OM_DEPTH_TO_Z * s.omStreamSpeed;

        if (wormholeFramedSkyMat) {
            wormholeFramedSkyMat.uniforms.uTime.value = rm ? 0 : time * 0.4;
            wormholeFramedSkyMat.uniforms.uDepth.value = whDepth * 0.05;
            wormholeFramedSkyMat.uniforms.uZoom.value = s.juliaFrameZoom;
            wormholeFramedSkyMat.uniforms.uIntensity.value = s.skyIntensity;
            wormholeFramedSkyMat.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
            wormholeFramedSkyMat.uniforms.uDiscRadius.value = s.discRadius;
            wormholeFramedSkyMat.uniforms.uPulseAmount.value = s.juliaPulseAmount;
            wormholeFramedSkyMat.uniforms.uPulseSpeed.value = s.juliaPulseSpeed;
            wormholeFramedSkyMat.uniforms.uParallaxAmount.value = s.juliaParallaxAmount;
            wormholeFramedSkyMat.uniforms.uRotationSpeed.value = s.juliaRotationSpeed;
            wormholeFramedSkyMat.uniforms.uRidgeStrength.value = s.juliaRidgeStrength;
            wormholeFramedSkyMat.uniforms.uFractalEvolutionSpeed.value = s.fractalEvolutionSpeed;
            if (wormholeFramedSkyMat.uniforms.uResolution) {
                wormholeFramedSkyMat.uniforms.uResolution.value.set(
                    window.innerWidth,
                    window.innerHeight
                );
            }
        }

        var ri;
        for (ri = 0; ri < wormholeRingMeshes.length; ri++) {
            var ring = wormholeRingMeshes[ri];
            var relZ = ring.position.z + whDepth;
            if (relZ > 5) ring.position.z -= tunnelLen;
            else if (relZ < -tunnelLen + 5) ring.position.z += tunnelLen;
            if (!rm) {
                var distFactor = THREE.Math.clamp(-relZ / tunnelLen, 0, 1);
                var spinRate =
                    ring.userData.spin * (0.6 + distFactor * 1.8) + whVelocitySm * 0.04;
                ring.rotation.z += spinRate * dt;
            }
        }

        for (ri = 0; ri < wormholeRingMats.length; ri++) {
            var m = wormholeRingMats[ri];
            m.uniforms.uTime.value = rm ? 0 : time;
            m.uniforms.uDepth.value = whDepth;
            m.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
            m.uniforms.uDiscRadius.value = s.discRadius;
            m.uniforms.uIntensity.value = s.ringIntensity;
            m.uniforms.uFractalEvolutionSpeed.value = s.fractalEvolutionSpeed;
            m.uniforms.uIndex.value = ri;
            var uZm = 1.4 + (ri % 5) * 0.12;
            m.uniforms.uZoom.value = uZm;
        }

        var hi;
        for (hi = 0; hi < wormholeHelixMeshes.length; hi++) {
            var h = wormholeHelixMeshes[hi];
            if (!rm) {
                h.rotation.z =
                    time * 0.18 + h.userData.basePhase * 0.3 + whDepth * 0.04;
            }
            var flare = Math.min(Math.abs(whVelocitySm) * s.helixFlareGain, 2.5);
            var hm = h.material;
            var nh2 = wormholeHelixMeshes.length || 1;
            wormholeColorFromPickerHex(s.whColorHelix);
            _wormholePickCol.getHSL(_wormholePickHsl);
            var hxS = Math.max(0.35, _wormholePickHsl.s);
            var hxL = Math.max(0.22, Math.min(0.62, _wormholePickHsl.l));
            h.userData.baseColor.setHSL(whNormHue01(_wormholePickHsl.h + hi / nh2), hxS, hxL);
            hm.color.copy(h.userData.baseColor).multiplyScalar(1 + flare);
            hm.opacity = Math.min(0.85 + flare * 0.15, 1.0);
        }

        if (wormholeOmSharedMat && wormholeOmSharedMat.color) {
            wormholeOmSharedMat.color.copy(wormholeColorFromPickerHex(s.whColorOm));
        }

        var dzOm = dzOmBase;
        var si;
        for (si = 0; si < wormholeOmSprites.length; si++) {
            var spr = wormholeOmSprites[si];
            spr.position.z += dzOm;
            if (spr.position.z > 5) spr.position.z -= tunnelLen;
            else if (spr.position.z < -tunnelLen + 5) spr.position.z += tunnelLen;
            if (!rm) {
                var x = spr.position.x;
                var y = spr.position.y;
                var ph = spr.userData.phase || 0;
                var angSpeed = 0.04 + ph * 0.002;
                var cs = Math.cos(angSpeed * dt);
                var sn = Math.sin(angSpeed * dt);
                spr.position.x = x * cs - y * sn;
                spr.position.y = x * sn + y * cs;
            }
        }

        wormholeApplySceneFog();
    }
