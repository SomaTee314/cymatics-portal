    /* ── Julia wormhole: Wormhole.zip parity (framed Julia sky + disk Julia rings + helices + Om sprites), audio-driven depth ── */
    var wormholeGui = null;
    var wormholeRoot = null;
    var wormholeSceneBuilt = false;
    var whDepth = 0;
    var whPrevDepth = 0;
    var wormholeRingPulseT0 = -1;
    var wormholeRingPulseStartScale = 1;
    var wormholeRingPulseLoggedStart = false;
    var wormholeRingPulsePeakLogCycle = -1;
    var wormholeRingPulseLastSoloLogT = -1;
    var WORMHOLE_RING_PULSE_HOLD = 3;
    var WORMHOLE_RING_PULSE_SHRINK = 11;
    var WORMHOLE_RING_PULSE_GROW = 11;
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
        ringIntensity: 1.08,
        skyIntensity: 1.12,
        /** Annulus pulse: max XY mesh scale (baseline 1; raise for larger annulus on screen). */
        ringPulsePeakMul: 1.0,
        /** Annulus pulse: min XY mesh scale at full shrink. */
        ringPulseEndScale: 0.03,
        /** Hide sky, helices, Om — only `wormholeRingMeshes` (debug). */
        debugAnnulusOnly: false,
        /** Verbose `[WormholeRingPulse]` peakHold / endVerify logs (off by default). */
        debugRingPulseLogs: false,
        /** Azura Shiva: subtle same-hue blue ramp across layers (flat #0000ff everywhere reads dull). helixHueSpread stays 0. */
        whColorSky: '#8888ff',
        whColorRing: '#0000b8',
        /** Centre spiral tubes (TubeGeometry helices). */
        whColorHelix: '#2222ff',
        /** Second spiral tone; when ≈ A, use `helixHueSpread` only. */
        whColorHelixB: '#6666ff',
        /** When A and B match, offset hue by (strandIndex / helixCount) × this. 0 = strand colours follow A→B only (no rainbow). */
        helixHueSpread: 0,
        whColorOm: '#5555ff',
        /** Saturated chroma → monochrome Julia from pick; near-neutral → technicolor IQ palette. */
        whJuliaFractColor: '#1818ff'
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

    /** Readout suffix after `Azura Shiva` base tag (portal dropdown; Siegel = Disc per product copy). */
    var JULIA_WH_PORTAL_READOUT_SUFFIX = {
        juliaWH_rabbit: ' · Fractal Vortex',
        juliaWH_dendrite: ' · Cosmic Magenta',
        juliaWH_sanMarco: ' · Radiant Helios',
        juliaWH_siegel: ' · Siegel Disc',
        juliaWH_recursive: ' · Solar Amber',
        juliaWH_spiral: ' · Red Dragon',
        juliaWH_airplane: ' · Gradient Pulse',
        juliaWH_cauliflower: ' · Green Tree Frog'
    };

    /**
     * Optional per-preset wormholeControls overlay when no in-session snapshot exists,
     * and for "Reset defaults (zip)" while that preset is selected.
     */
    var JULIA_WH_PORTAL_PRESET_TUNING = {
        juliaWH_spiral: {
            helixFlareGain: 1,
            omStreamSpeed: 0.011,
            whColorHelix: '#ff0000',
            whColorHelixB: '#ff0000',
            helixHueSpread: 0,
            fogDensity: 0.02,
            whColorSky: '#ff0000',
            whColorRing: '#ff0000',
            whColorOm: '#ff0000',
            whJuliaFractColor: '#fc0000'
        },
        juliaWH_sanMarco: {
            helixFlareGain: 1,
            omStreamSpeed: 0.011,
            whColorHelix: '#ffff00',
            whColorHelixB: '#ffff00',
            helixHueSpread: 0,
            fogDensity: 0.02,
            whColorSky: '#ffff00',
            whColorRing: '#ffff00',
            whColorOm: '#ffff00',
            whJuliaFractColor: '#ffff00'
        },
        juliaWH_recursive: {
            helixFlareGain: 1,
            omStreamSpeed: 0.011,
            whColorHelix: '#ff7a00',
            whColorHelixB: '#ff7a00',
            helixHueSpread: 0,
            fogDensity: 0.02,
            whColorSky: '#ff7a00',
            whColorRing: '#ff7a00',
            whColorOm: '#ff7a00',
            whJuliaFractColor: '#ff7a00'
        },
        juliaWH_cauliflower: {
            helixFlareGain: 1,
            omStreamSpeed: 0.011,
            whColorHelix: '#00ff00',
            whColorHelixB: '#00ff00',
            helixHueSpread: 0,
            fogDensity: 0.02,
            whColorSky: '#00ff00',
            whColorRing: '#00ff00',
            whColorOm: '#00ff00',
            whJuliaFractColor: '#00ff00'
        },
        juliaWH_dendrite: {
            helixFlareGain: 1,
            omStreamSpeed: 0.011,
            whColorHelix: '#f200ff',
            whColorHelixB: '#e200ff',
            helixHueSpread: 0,
            fogDensity: 0.02,
            whColorSky: '#ff00ed',
            whColorRing: '#ff00ed',
            whColorOm: '#ff00fc',
            whJuliaFractColor: '#0002ff'
        },
        juliaWH_airplane: {
            helixFlareGain: 1,
            omStreamSpeed: 0.011,
            whColorHelix: '#9eff00',
            whColorHelixB: '#9eff00',
            helixHueSpread: 0,
            fogDensity: 0.02,
            whColorSky: '#9eff00',
            whColorRing: '#9eff00',
            whColorOm: '#9eff00',
            whJuliaFractColor: '#9eff00'
        }
    };

    /** Per `aggressionSel` wormhole entry (`juliaWormhole`, `juliaWH_*`): colours + tunnel tuning stay separate. */
    var wormholeControlsSnapshots = {};
    var wormholeControlsBaseline = null;
    var wormholeLastPortalSelect = null;

    function wormholeIsJuliaTunnelKey(key) {
        if (!key) return false;
        if (key === 'juliaWormhole') return true;
        return Object.prototype.hasOwnProperty.call(JULIA_WH_PORTAL_PRESETS, key);
    }

    function wormholeEnsureBaseline() {
        if (!wormholeControlsBaseline) {
            wormholeControlsBaseline = wormholeCaptureSnapshot();
        }
    }

    function wormholeCaptureSnapshot() {
        var out = {};
        var k;
        for (k in wormholeControls) {
            if (Object.prototype.hasOwnProperty.call(wormholeControls, k)) {
                out[k] = wormholeControls[k];
            }
        }
        return out;
    }

    function wormholeApplySnapshot(snap) {
        if (!snap) return;
        var k;
        for (k in snap) {
            if (Object.prototype.hasOwnProperty.call(wormholeControls, k)) {
                wormholeControls[k] = snap[k];
            }
        }
    }

    function wormholeOnAggressionPresetBefore(nextKey) {
        wormholeEnsureBaseline();
        if (wormholeLastPortalSelect != null && wormholeIsJuliaTunnelKey(wormholeLastPortalSelect)) {
            wormholeControlsSnapshots[wormholeLastPortalSelect] = wormholeCaptureSnapshot();
        }
        if (wormholeIsJuliaTunnelKey(nextKey)) {
            var stored = wormholeControlsSnapshots[nextKey];
            if (stored) {
                wormholeApplySnapshot(stored);
            } else {
                wormholeApplySnapshot(wormholeControlsBaseline);
                var tune =
                    typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                        ? JULIA_WH_PORTAL_PRESET_TUNING[nextKey]
                        : null;
                if (tune) wormholeApplySnapshot(tune);
            }
            wormholeLastPortalSelect = nextKey;
        } else {
            wormholeLastPortalSelect = null;
        }
    }

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
    var _helHslB = { h: 0, s: 0, l: 0 };

    /**
     * dat.GUI addColor may set properties as hex string, 0xRRGGBB number, or {r,g,b} 0–255.
     */
    function wormholeColorFromPickerHex(raw, outColor) {
        var dest = outColor || _wormholePickCol;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            var ih = raw >>> 0;
            ih = ih & 0xffffff;
            dest.setRGB(((ih >> 16) & 255) / 255, ((ih >> 8) & 255) / 255, (ih & 255) / 255);
            return dest;
        }
        if (raw && typeof raw === 'object' && typeof raw.r === 'number') {
            var rr = raw.r > 1.01 ? raw.r / 255 : raw.r;
            var gg = raw.g > 1.01 ? raw.g / 255 : raw.g;
            var bb = raw.b > 1.01 ? raw.b / 255 : raw.b;
            dest.setRGB(rr, gg, bb);
            return dest;
        }
        var s = raw == null ? '' : String(raw).trim();
        var hx = s.replace(/^#/, '').replace(/[^0-9a-f]/gi, '');
        if (!hx.length) {
            dest.setRGB(1, 1, 1);
            return dest;
        }
        if (hx.length === 8) {
            hx = hx.slice(2, 8);
        } else if (hx.length > 6) {
            hx = hx.slice(0, 6);
        }
        if (hx.length === 6) {
            dest.setRGB(
                parseInt(hx.slice(0, 2), 16) / 255,
                parseInt(hx.slice(2, 4), 16) / 255,
                parseInt(hx.slice(4, 6), 16) / 255
            );
            return dest;
        }
        if (hx.length === 3) {
            dest.setRGB(
                parseInt(hx.charAt(0) + hx.charAt(0), 16) / 255,
                parseInt(hx.charAt(1) + hx.charAt(1), 16) / 255,
                parseInt(hx.charAt(2) + hx.charAt(2), 16) / 255
            );
            return dest;
        }
        dest.setRGB(1, 1, 1);
        return dest;
    }

    var _julFractPickRgb = new THREE.Vector3(1, 1, 1);
    var _whRingTintRgb = new THREE.Vector3(1, 1, 1);

    var WORMHOLE_GRADIENT_PULSE_PERIOD = 11;
    var _wormholeGpHue01 = null;
    var _wormholeGpRgb = new THREE.Color();

    function wormholeRgb01ToSv(r, g, b) {
        var mx = Math.max(r, Math.max(g, b));
        var mn = Math.min(r, Math.min(g, b));
        var v = mx;
        var s = mx <= 1e-8 ? 0 : (mx - mn) / mx;
        return { s: s, v: v };
    }

    function wormholeHue01ToRgbSv1(h01, outColor) {
        h01 = ((h01 % 1) + 1) % 1;
        var h = h01 * 6;
        var i = Math.floor(h);
        var f = h - i;
        switch (i % 6) {
            case 0:
                outColor.setRGB(1, f, 0);
                break;
            case 1:
                outColor.setRGB(1 - f, 1, 0);
                break;
            case 2:
                outColor.setRGB(0, 1, f);
                break;
            case 3:
                outColor.setRGB(0, 1 - f, 1);
                break;
            case 4:
                outColor.setRGB(f, 0, 1);
                break;
            default:
                outColor.setRGB(1, 0, 1 - f);
                break;
        }
        return outColor;
    }

    function wormholeGpFractPickIsMaxIntensity() {
        try {
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return false;
            }
        } catch (_eRm) {}
        try {
            if (typeof aggressionSel === 'undefined' || !aggressionSel) return false;
            if (aggressionSel.value !== 'juliaWH_airplane') return false;
        } catch (_eA) {
            return false;
        }
        wormholeColorFromPickerHex(wormholeControls.whJuliaFractColor || '#ffffff');
        var rr = _wormholePickCol.r;
        var gg = _wormholePickCol.g;
        var bb = _wormholePickCol.b;
        var sv = wormholeRgb01ToSv(rr, gg, bb);
        return sv.s >= 0.94 && sv.v >= 0.94;
    }

    function wormholeRefreshGradientPulse(timeSec) {
        _wormholeGpHue01 = null;
        if (!wormholeGpFractPickIsMaxIntensity()) return;
        var period = WORMHOLE_GRADIENT_PULSE_PERIOD;
        if (!(period > 0)) return;
        if (!isFinite(timeSec)) timeSec = 0;
        _wormholeGpHue01 = ((timeSec / period % 1) + 1) % 1;
        wormholeHue01ToRgbSv1(_wormholeGpHue01, _wormholeGpRgb);
    }

    /** 1 = legacy technicolor cosine (near-neutral picker only); 0 = tint fractal from pickRgb. */
    function wormholeJuliaFractRainbowAmtLoaded() {
        var rr = _wormholePickCol.r;
        var gg = _wormholePickCol.g;
        var bb = _wormholePickCol.b;
        var mx = Math.max(rr, Math.max(gg, bb));
        var mn = Math.min(rr, Math.min(gg, bb));
        if (mx - mn < 0.035) return 1;
        return 0;
    }

    function wormholeApplyJuliaFractColourUniforms() {
        if (_wormholeGpHue01 !== null) {
            _julFractPickRgb.set(_wormholeGpRgb.r, _wormholeGpRgb.g, _wormholeGpRgb.b);
            if (wormholeFramedSkyMat && wormholeFramedSkyMat.uniforms.uJuliaPickRgb) {
                wormholeFramedSkyMat.uniforms.uJuliaPickRgb.value.copy(_julFractPickRgb);
                wormholeFramedSkyMat.uniforms.uJuliaRainbow.value = 0;
            }
            var riGp;
            for (riGp = 0; riGp < wormholeRingMats.length; riGp++) {
                var matGp = wormholeRingMats[riGp];
                if (matGp.uniforms.uJuliaPickRgb) {
                    matGp.uniforms.uJuliaPickRgb.value.copy(_julFractPickRgb);
                    matGp.uniforms.uJuliaRainbow.value = 0;
                }
            }
            return;
        }
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

    function wormholeApplySceneAccentTints() {
        if (!wormholeSceneBuilt || !wormholeFramedSkyMat || !wormholeFramedSkyMat.uniforms.uSkyTint)
            return;
        if (_wormholeGpHue01 !== null) {
            wormholeFramedSkyMat.uniforms.uSkyTint.value.set(
                _wormholeGpRgb.r,
                _wormholeGpRgb.g,
                _wormholeGpRgb.b
            );
            _whRingTintRgb.set(1, 1, 1);
            var riP;
            for (riP = 0; riP < wormholeRingMats.length; riP++) {
                var matP = wormholeRingMats[riP];
                if (matP.uniforms.uRingTint) {
                    matP.uniforms.uRingTint.value.copy(_whRingTintRgb);
                }
            }
            return;
        }
        wormholeColorFromPickerHex(wormholeControls.whColorSky || '#ffffff');
        wormholeFramedSkyMat.uniforms.uSkyTint.value.set(
            _wormholePickCol.r,
            _wormholePickCol.g,
            _wormholePickCol.b
        );
        wormholeColorFromPickerHex(wormholeControls.whColorRing || '#ffffff');
        _whRingTintRgb.set(_wormholePickCol.r, _wormholePickCol.g, _wormholePickCol.b);
        var ri;
        for (ri = 0; ri < wormholeRingMats.length; ri++) {
            var mat = wormholeRingMats[ri];
            if (mat.uniforms.uRingTint) {
                mat.uniforms.uRingTint.value.copy(_whRingTintRgb);
            }
        }
    }

    function wormholeApplyPickerColorsToShaders() {
        var tGp = 0;
        if (typeof clock !== 'undefined' && clock && typeof clock.getElapsedTime === 'function') {
            tGp = clock.getElapsedTime();
        }
        wormholeRefreshGradientPulse(tGp);
        wormholeApplyJuliaFractColourUniforms();
        wormholeApplySceneAccentTints();
    }

    function whNormHue01(v) {
        v = ((v % 1) + 1) % 1;
        return v;
    }

    function wormholeLerpHue01(h0, h1, t) {
        var dh = ((h1 - h0 + 0.5) % 1) - 0.5;
        return whNormHue01(h0 + dh * t);
    }

    /**
     * Centre spiral tubes: base is always Colour A→B along strand index. Optional `helixHueSpread`
     * adds a rainbow twist (legacy); keep it at 0 so similar reds stay red instead of drifting to yellow.
     */
    function wormholeHelixStrandColor(idx, nh, destColor) {
        if (_wormholeGpHue01 !== null) {
            destColor.copy(_wormholeGpRgb);
            return destColor;
        }
        var sCtl = wormholeControls;
        nh = Math.max(1, nh);
        wormholeColorFromPickerHex(sCtl.whColorHelix);
        _wormholePickCol.getHSL(_wormholePickHsl);
        wormholeColorFromPickerHex(
            sCtl.whColorHelixB != null ? sCtl.whColorHelixB : sCtl.whColorHelix
        );
        _wormholePickCol.getHSL(_helHslB);
        var hA = _wormholePickHsl.h;
        var sA = _wormholePickHsl.s;
        var lA = _wormholePickHsl.l;
        var hB = _helHslB.h;
        var sB = _helHslB.s;
        var lB = _helHslB.l;
        var tLin = nh <= 1 ? 0 : idx / Math.max(1, nh - 1);
        var hm = wormholeLerpHue01(hA, hB, tLin);
        var sm = THREE.Math.clamp(sA + (sB - sA) * tLin, 0, 1);
        var lm = THREE.Math.clamp(lA + (lB - lA) * tLin, 0, 1);
        sm = Math.max(0.35, sm);
        lm = Math.max(0.22, Math.min(0.62, lm));
        var spread =
            typeof sCtl.helixHueSpread === 'number' && isFinite(sCtl.helixHueSpread)
                ? sCtl.helixHueSpread
                : 0;
        if (spread > 1e-4) {
            hm = whNormHue01(hm + (idx / nh) * spread);
        }
        destColor.setHSL(hm, sm, lm);
        return destColor;
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

    /** Ring pulse period (s); cosine max→min→max uses this full length (HOLD+SHRINK+GROW sum). */
    function wormholeRingPulsePeriod() {
        return WORMHOLE_RING_PULSE_HOLD + WORMHOLE_RING_PULSE_SHRINK + WORMHOLE_RING_PULSE_GROW;
    }

    function wormholeRingPulsePeakMulNow() {
        var m = Number(wormholeControls.ringPulsePeakMul);
        if (!(m > 0) || !isFinite(m)) return 1;
        return m;
    }

    function wormholeRingPulseMinMaxScales() {
        var mul = wormholeRingPulsePeakMulNow();
        var maxScale = Math.max(0.02, mul);
        var endCfg = Number(wormholeControls.ringPulseEndScale);
        var minScale =
            endCfg > 0 && isFinite(endCfg)
                ? endCfg
                : 0.03;
        minScale = THREE.Math.clamp(minScale, 0.01, maxScale * 0.92);
        if (minScale >= maxScale - 1e-4) {
            minScale = Math.max(0.01, maxScale * 0.5);
        }
        var lo = Math.min(minScale, maxScale);
        var hi = Math.max(minScale, maxScale);
        return { maxScale: maxScale, minScale: minScale, lo: lo, hi: hi };
    }

    /** Normalized cycle phase in [0, 1) for ring mesh + ring shader (same clock). */
    function wormholeRingPulsePsi(ringPulseT) {
        var period = wormholeRingPulsePeriod();
        if (!(period > 0) || !isFinite(ringPulseT)) return 0;
        var ph = ringPulseT - Math.floor(ringPulseT / period) * period;
        if (ph < 0) ph += period;
        if (ph >= period) ph = 0;
        return ph / period;
    }

    /** One cosine period: maxScale → minScale → maxScale (ties to `wormholeRingPulsePsi`). */
    function wormholeRingPulseScaleFromPsi(psi, rm) {
        var mm = wormholeRingPulseMinMaxScales();
        var maxScale = mm.maxScale;
        var minScale = mm.minScale;
        var lo = mm.lo;
        var hi = mm.hi;
        if (rm) {
            return hi;
        }
        var psiN = psi - Math.floor(psi);
        if (psiN < 0) psiN += 1;
        var c = Math.cos(6.283185307179586 * psiN);
        var s = maxScale + (minScale - maxScale) * (0.5 - 0.5 * c);
        return THREE.Math.clamp(s, lo, hi);
    }

    /** Ring z0 divides by uZoom — keep baseline at or above `juliaFrameZoom` (never the old 1.4 bucket). */
    function wormholeRingZoomForIndex(ringIndex, frameZoom) {
        var fz =
            typeof frameZoom === 'number' && isFinite(frameZoom) ? Math.max(frameZoom, 0.6) : 1.5;
        var fr = ringIndex * 0.618033988749895;
        fr = fr - Math.floor(fr);
        return fz * (1.0 + fr * 0.065);
    }

    /** Near-camera rings: slightly *lower* uZoom than deep tunnel so |z0| stays large (avoids flat filled Julia interior). */
    var WORMHOLE_RING_NEAR_ZOOM_MUL = 0.93;

    function wormholeRingZoomWithProximity(ringIndex, frameZoom, tunnelLen, relZ) {
        var base = wormholeRingZoomForIndex(ringIndex, frameZoom);
        var denom =
            typeof tunnelLen === 'number' && isFinite(tunnelLen) && tunnelLen > 1e-6
                ? tunnelLen
                : 1;
        var distFactor = THREE.Math.clamp(-relZ / denom, 0, 1);
        var proxMul = WORMHOLE_RING_NEAR_ZOOM_MUL * (1.0 - distFactor) + 1.0 * distFactor;
        return base * proxMul;
    }

    /** Verbatim ring Julia shaders from `juliaWormholeShaders.ts` */
    function wormholeRingVertexGlsl() {
        return [
            'varying vec2 vUv;',
            'uniform float uRingRefR;',
            'varying vec2 vLoc;',
            'void main() {',
            '  vUv = uv;',
            '  vLoc = position.xy / max(uRingRefR, 1e-3);',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
        ].join('\n');
    }

    function wormholeRingFragmentGlsl() {
        return [
            'precision highp float;',
            'varying vec2 vUv;',
            'varying vec2 vLoc;',
            'uniform float uDepth;',
            'uniform float uRingCyclePhase;',
            'uniform float uIndex;',
            'uniform float uZoom;',
            'uniform float uIntensity;',
            'uniform vec2 uCenter;',
            'uniform float uDiscRadius;',
            'uniform float uMode;',
            'uniform float uFractalEvolutionSpeed;',
            'uniform float uAnnInnerN;',
            'uniform float uAnnOuterN;',
            'uniform vec3 uJuliaPickRgb;',
            'uniform float uJuliaRainbow;',
            'uniform vec3 uRingTint;',
            wormholeColorShiftGlsl(),
            'vec3 palette(float t) {',
            '  vec3 a = vec3(0.5);',
            '  vec3 b = vec3(0.55);',
            '  vec3 c = vec3(1.0);',
            '  vec3 d = vec3(0.00, 0.33, 0.67);',
            '  return a + b * cos(6.28318530718 * (c * t + d));',
            '}',
            'void main() {',
            '  float rl = length(vLoc);',
            '  float denom = max(uAnnOuterN - uAnnInnerN, 0.001);',
            '  float tRadial = clamp((rl - uAnnInnerN) / denom, 0.0, 1.0);',
            '  float psi = atan(vLoc.y, vLoc.x);',
            '  float ringTwist = uIndex * 0.713;',
            '  float wrapK = 3.0 + mod(uIndex, 4.0);',
            '  float psiWrap = psi * wrapK + ringTwist + 0.38 * sin(psi * 0.5 + uIndex * 0.17);',
            '  vec2 dirP = vec2(cos(psiWrap), sin(psiWrap));',
            '  float magRadial = 1.0 + 0.042 * sin((tRadial + uIndex * 0.03) * 6.28318530718);',
            '  float mag = mix(0.67, 0.715, tRadial) * magRadial;',
            '  vec2 z0 = dirP * mag / max(uZoom, 1e-3);',
            '  float dEv = uDepth * uFractalEvolutionSpeed;',
            '  float cycleParam = 0.5 - 0.5 * cos(6.28318530718 * uRingCyclePhase);',
            '  float phCycle = cycleParam * 6.28318530718;',
            '  float ph1 = phCycle * 0.52 + uIndex * 0.7 + dEv * 0.15;',
            '  float ph2 = phCycle * 0.68 + uIndex * 1.1 + dEv * 0.13;',
            '  vec2 jC = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));',
            '  const int MAX_ITERS = 96;',
            '  const float B = 64.0;',
            '  const float INV_TWO_PI = 0.15915494309189535;',
            '  vec2 z = z0;',
            '  float m2 = dot(z, z);',
            '  float n = 0.0;',
            '  for (int i = 0; i < MAX_ITERS; i++) {',
            '    if (m2 > B * B) break;',
            '    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + jC;',
            '    m2 = dot(z, z);',
            '    n += 1.0;',
            '  }',
            '  float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;',
            '  float zAng = atan(z.y, z.x);',
            '  float tanAng = atan(vLoc.y, vLoc.x);',
            '  float tLin = clamp(n / float(MAX_ITERS), 0.0, 1.0);',
            '  float escaped = step(B * B, m2);',
            '  float interiorW = 1.0 - escaped;',
            '  float zm = max(m2, 1e-7);',
            '  float trapOrbit = fract(zAng * INV_TWO_PI * 3.1 + log(zm) * 0.14 + uIndex * 0.09);',
            '  float trap2 = fract(tanAng * 2.7 + tRadial * 4.1 + uIndex * 0.11);',
            '  float tRaw = 0.04 * sn + 0.06 * dEv + uIndex * 0.07 + cycleParam * 0.12',
            '             + 0.062 * zAng * INV_TWO_PI + 0.048 * tanAng * INV_TWO_PI',
            '             + 0.16 * tLin * interiorW + 0.11 * trapOrbit * interiorW + 0.06 * trap2 * interiorW;',
            '  float paletteT = clamp(fract(tRaw), 0.001, 0.999);',
            '  vec3 pal = palette(paletteT);',
            '  vec3 col = wh_juliaFractColorize(pal, uJuliaPickRgb, uJuliaRainbow);',
            '  col *= clamp(uRingTint, vec3(1.0 / 255.0), vec3(2.75));',
            '  float interBright = clamp(0.48 + 0.42 * tLin + 0.28 * trapOrbit + 0.14 * trap2, 0.44, 0.96);',
            '  col *= mix(interBright, 1.06, escaped);',
            '  col = 1.0 - exp(-col * uIntensity);',
            '  float alpha = 1.0;',
            '  if (uMode < 0.5) {',
            '    float edgeFade = smoothstep(0.0, 0.09, tRadial) * smoothstep(1.0, 0.96, tRadial);',
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
            'uniform vec3 uSkyTint;',
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
            '  col *= clamp(uSkyTint, vec3(1.0 / 255.0), vec3(2.75));',
            '  float nearEdge = (1.0 - tLin) * (1.0 - tLin);',
            '  col *= 1.0 + 0.22 * nearEdge;',
            '  col *= mix(0.04, 1.2, escaped);',
            '  col = 1.0 - exp(-col * uIntensity);',
            '  gl_FragColor = vec4(col, 1.0);',
            '}'
        ].join('\n');
    }

    function wormholeMakeRingMat(ringIndex, tunnelLen) {
        var s = wormholeControls;
        var relZ = -ringIndex * s.ringSpacing;
        var uZoom = wormholeRingZoomWithProximity(ringIndex, s.juliaFrameZoom, tunnelLen, relZ);
        return new THREE.ShaderMaterial({
            uniforms: {
                uDepth: { value: 0 },
                uRingCyclePhase: { value: 0 },
                uIndex: { value: ringIndex },
                uZoom: { value: uZoom },
                uIntensity: { value: s.ringIntensity },
                uCenter: { value: new THREE.Vector2(s.juliaCx, s.juliaCy) },
                uDiscRadius: { value: s.discRadius },
                uMode: { value: 0 },
                uFractalEvolutionSpeed: { value: s.fractalEvolutionSpeed },
                uRingRefR: { value: s.ringRadius },
                uAnnInnerN: { value: 0.81 },
                uAnnOuterN: { value: 1.0 },
                uJuliaPickRgb: { value: new THREE.Vector3(1, 1, 1) },
                uJuliaRainbow: { value: 1 },
                uRingTint: { value: new THREE.Vector3(1, 1, 1) }
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
                uJuliaRainbow: { value: 1 },
                uSkyTint: { value: new THREE.Vector3(1, 1, 1) }
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
        wormholeRingPulseHardReset();
    }

    function wormholeRingPulseHardReset() {
        wormholeRingPulseT0 = -1;
        wormholeRingPulseStartScale = 1;
        wormholeRingPulseLoggedStart = false;
        wormholeRingPulsePeakLogCycle = -1;
        wormholeRingPulseLastSoloLogT = -1;
    }

    /**
     * om-neon.png is a navy starfield square plus a centred neon Om. Per-pixel luminance/sat
     * heuristics still leave faint star clusters visible (additive sprites read as tinted quads).
     * Threshold into a foreground mask, keep only the largest 8-connected component (the glyph +
     * its glow), discard all other blobs, then derive alpha inside that mask only.
     */
    function wormholeOmTextureTransparencyFromMap(map) {
        var img = map.image;
        if (!img || !img.width || !img.height) return map;
        var w = img.width;
        var h = img.height;
        var n = w * h;
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var id = ctx.getImageData(0, 0, w, h);
        var pix = id.data;
        var lumArr = new Float32Array(n);
        var satArr = new Float32Array(n);
        var bw = new Uint8Array(n);
        var pi;
        for (pi = 0; pi < n; pi++) {
            var o = pi * 4;
            var rn = pix[o] / 255;
            var gn = pix[o + 1] / 255;
            var bn = pix[o + 2] / 255;
            var mx = Math.max(rn, Math.max(gn, bn));
            var mn = Math.min(rn, Math.min(gn, bn));
            var lum = rn * 0.299 + gn * 0.587 + bn * 0.114;
            lumArr[pi] = lum;
            satArr[pi] = mx - mn;
            bw[pi] = lum > 0.41 || satArr[pi] > 0.32 ? 1 : 0;
        }
        var comp = new Int32Array(n);
        for (pi = 0; pi < n; pi++) {
            comp[pi] = bw[pi] ? 0 : -1;
        }
        var cid = 0;
        var compSizes = [];
        var q = new Int32Array(n);
        var sy;
        var sx;
        for (sy = 0; sy < h; sy++) {
            for (sx = 0; sx < w; sx++) {
                var si = sy * w + sx;
                if (comp[si] !== 0) continue;
                cid++;
                var qh = 0;
                var qt = 0;
                q[qt++] = si;
                comp[si] = cid;
                var cnt = 0;
                while (qh < qt) {
                    var ci = q[qh++];
                    cnt++;
                    var cy = (ci / w) | 0;
                    var cx = ci - cy * w;
                    var oy;
                    for (oy = -1; oy <= 1; oy++) {
                        var ny = cy + oy;
                        if (ny < 0 || ny >= h) continue;
                        var ox;
                        for (ox = -1; ox <= 1; ox++) {
                            if (ox === 0 && oy === 0) continue;
                            var nx = cx + ox;
                            if (nx < 0 || nx >= w) continue;
                            var ni = ny * w + nx;
                            if (comp[ni] !== 0) continue;
                            comp[ni] = cid;
                            q[qt++] = ni;
                        }
                    }
                }
                compSizes[cid] = cnt;
            }
        }
        var bestCid = 1;
        var bestSz = compSizes[1] || 0;
        var c;
        for (c = 2; c <= cid; c++) {
            var sc = compSizes[c] || 0;
            if (sc > bestSz) {
                bestSz = sc;
                bestCid = c;
            }
        }
        for (pi = 0; pi < pix.length; pi += 4) {
            var idx = pi / 4 | 0;
            var rn2 = pix[pi] / 255;
            var gn2 = pix[pi + 1] / 255;
            var bn2 = pix[pi + 2] / 255;
            var mx2 = Math.max(rn2, Math.max(gn2, bn2));
            var mn2 = Math.min(rn2, Math.min(gn2, bn2));
            var lum = lumArr[idx];
            var sat = mx2 - mn2;
            var cyanLean = gn2 - Math.max(rn2, bn2);
            var a = 0;
            var inGlyph = bw[idx] && comp[idx] === bestCid;
            if (!inGlyph) {
                a = 0;
            } else if (lum < 0.125 && sat < 0.055 && mx2 < 0.4) {
                a = 0;
            } else if (lum < 0.068 && mx2 < 0.22) {
                a = 0;
            } else {
                var energy = lum * 0.95 + sat * 2.4 + mx2 * 0.45 + Math.max(0, cyanLean) * 0.85;
                a = Math.pow(Math.max(0, Math.min(1, (energy - 0.1) / 0.92)), 0.88);
            }
            pix[pi + 3] = Math.round(a * 255);
        }
        ctx.putImageData(id, 0, 0);
        var nt = new THREE.CanvasTexture(canvas);
        nt.needsUpdate = true;
        nt.minFilter = THREE.LinearFilter;
        nt.magFilter = THREE.LinearFilter;
        if (typeof THREE !== 'undefined' && THREE.RGBAFormat != null) {
            nt.format = THREE.RGBAFormat;
        }
        try {
            map.dispose();
        } catch (eTx) {}
        return nt;
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
                map = wormholeOmTextureTransparencyFromMap(map);
                var aspect = map.image && map.image.height ? map.image.height / map.image.width : 1;
                var baseW = 0.24;
                wormholeOmSharedMat = new THREE.SpriteMaterial({
                    map: map,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    alphaTest: 0.015,
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
        var ringThetaSegs = 384;
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
            var ringMat = wormholeMakeRingMat(ri, tunnelLen);
            wormholeRingMats.push(ringMat);
            var ringGeo = new THREE.RingGeometry(ringRad * 0.81, ringRad, ringThetaSegs, 1);
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
            var colH = wormholeHelixStrandColor(hc, nh, new THREE.Color());
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
        wormholeRingPulseHardReset();
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
        var solo = !!s.debugAnnulusOnly;
        if (wormholeFramedSky) {
            wormholeFramedSky.visible = !solo;
        }
        var hvi;
        for (hvi = 0; hvi < wormholeHelixMeshes.length; hvi++) {
            wormholeHelixMeshes[hvi].visible = !solo;
        }
        if (wormholeOmGroup) {
            wormholeOmGroup.visible = !solo;
        }

        wormholeApplyPickerColorsToShaders();

        var dDepth = whDepth - whPrevDepth;
        whPrevDepth = whDepth;
        var OM_MAX_DEPTH_DELTA = tunnelLen * 3;
        var OM_DEPTH_TO_Z = 12;
        var dzOmBase =
            (!Number.isFinite(dDepth) || Math.abs(dDepth) > OM_MAX_DEPTH_DELTA
                ? whVelocitySm * dt
                : dDepth) * OM_DEPTH_TO_Z * s.omStreamSpeed;

        if (wormholeRingPulseT0 < 0) {
            wormholeRingPulseT0 = time > 0 ? time : 1e-6;
        }
        var ringPulseT = time - wormholeRingPulseT0;
        if (
            wormholeRingMeshes.length &&
            !rm &&
            !wormholeRingPulseLoggedStart
        ) {
            var ring0 = wormholeRingMeshes[0];
            var rawS = ring0.scale.x;
            wormholeRingPulseStartScale =
                rawS > 1e-5 && isFinite(rawS) ? rawS : 1;
            if (s.debugRingPulseLogs || s.debugAnnulusOnly) {
                var mm0 = wormholeRingPulseMinMaxScales();
                console.log('[WormholeRingPulse] startPoint', {
                    meshScale: wormholeRingPulseStartScale,
                    maxScale: mm0.maxScale,
                    minScale: mm0.minScale,
                    ringRadius: ringRad,
                    positionZ: ring0.position.z
                });
            }
            wormholeRingPulseLoggedStart = true;
        }
        var pulsePeriod = wormholeRingPulsePeriod();
        var psi = wormholeRingPulsePsi(ringPulseT);
        var ringPulseS = wormholeRingPulseScaleFromPsi(psi, wormholeIsReducedMotion());
        if (!isFinite(ringPulseS) || ringPulseS <= 0) {
            ringPulseS = wormholeRingPulseMinMaxScales().hi;
        }
        var pulseCycleIdx = Math.floor(ringPulseT / pulsePeriod);
        if (
            s.debugRingPulseLogs &&
            pulseCycleIdx < 3 &&
            psi < 0.02 &&
            wormholeRingPulsePeakLogCycle !== pulseCycleIdx &&
            wormholeRingPulseLoggedStart
        ) {
            console.log('[WormholeRingPulse] cyclePeak', {
                cycle: pulseCycleIdx,
                ringPulseS: ringPulseS,
                psi: psi,
                whDepth: whDepth,
                peakMul: s.ringPulsePeakMul
            });
            wormholeRingPulsePeakLogCycle = pulseCycleIdx;
        }
        if (
            s.debugRingPulseLogs &&
            solo &&
            wormholeRingMeshes.length &&
            (wormholeRingPulseLastSoloLogT < 0 || time - wormholeRingPulseLastSoloLogT >= 0.5)
        ) {
            var mmS = wormholeRingPulseMinMaxScales();
            console.log('[WormholeRingPulse] solo', {
                ringPulseS: ringPulseS,
                psi: psi,
                maxScale: mmS.maxScale,
                minScale: mmS.minScale,
                whDepth: whDepth,
                ringUDepth: 0
            });
            wormholeRingPulseLastSoloLogT = time;
        }

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

        /** Fixed tunnel slice for rings: do not add `whDepth` to `relZ` (same as debug annulus). XY pulse only; avoids Z-wrap / modulo pops that read as rings spawning off-axis. Sky, helices, Om, audio still use full `whDepth`. */
        var whRing = 0;
        var ri;
        for (ri = 0; ri < wormholeRingMeshes.length; ri++) {
            var ring = wormholeRingMeshes[ri];
            var relZ = ring.position.z + whRing;
            if (relZ > 5) ring.position.z -= tunnelLen;
            else if (relZ < -tunnelLen + 5) ring.position.z += tunnelLen;
            if (!rm) {
                var distFactor = THREE.Math.clamp(-relZ / tunnelLen, 0, 1);
                var spinRate =
                    ring.userData.spin * (0.6 + distFactor * 1.8) + whVelocitySm * 0.04;
                ring.rotation.z += spinRate * dt;
            }
            ring.scale.set(ringPulseS, ringPulseS, 1);
        }

        for (ri = 0; ri < wormholeRingMats.length; ri++) {
            var m = wormholeRingMats[ri];
            m.uniforms.uRingCyclePhase.value = rm ? 0 : psi;
            m.uniforms.uDepth.value = 0;
            m.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
            m.uniforms.uDiscRadius.value = s.discRadius;
            m.uniforms.uIntensity.value = s.ringIntensity;
            m.uniforms.uFractalEvolutionSpeed.value = s.fractalEvolutionSpeed;
            m.uniforms.uRingRefR.value = s.ringRadius;
            m.uniforms.uAnnInnerN.value = 0.81;
            m.uniforms.uAnnOuterN.value = 1.0;
            m.uniforms.uIndex.value = ri;
            var rz = wormholeRingMeshes[ri].position.z + whRing;
            m.uniforms.uZoom.value = wormholeRingZoomWithProximity(
                ri,
                s.juliaFrameZoom,
                tunnelLen,
                rz
            );
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
            wormholeHelixStrandColor(hi, nh2, h.userData.baseColor);
            hm.color.copy(h.userData.baseColor).multiplyScalar(1 + flare);
            hm.opacity = Math.min(0.85 + flare * 0.15, 1.0);
            h.scale.set(1, 1, 1);
        }

        if (wormholeOmSharedMat && wormholeOmSharedMat.color) {
            if (_wormholeGpHue01 !== null) {
                wormholeOmSharedMat.color.copy(_wormholeGpRgb);
            } else {
                wormholeOmSharedMat.color.copy(wormholeColorFromPickerHex(s.whColorOm));
            }
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
