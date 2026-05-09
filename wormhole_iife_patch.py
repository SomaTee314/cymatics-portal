# -*- coding: utf-8 -*-
"""Inject Julia wormhole portal mode into the Cymatics IIFE during _build_portal.py."""

from pathlib import Path


def apply_julia_wormhole_iife_patch(iife2: str, project_root: Path) -> str:
    frag_path = project_root / "_wormhole_build_fragment.js"
    if not frag_path.is_file():
        raise SystemExit(
            "Missing _wormhole_build_fragment.js — required for Julia wormhole integration"
        )
    wh = frag_path.read_text(encoding="utf-8").rstrip()
    _mark = """    function fractalExpSmooth(cur, target, dt, tau) {
        if (!(tau > 0) || !isFinite(dt) || dt <= 0) return target;
        var a = 1 - Math.exp(-dt / tau);
        return cur + (target - cur) * a;
    }

    /** Fractal backdrop"""
    if _mark not in iife2:
        raise SystemExit("wormhole: fractalExpSmooth anchor not found in IIFE")
    iife2 = iife2.replace(
        _mark,
        _mark.replace("    /** Fractal backdrop", wh + "\n\n    /** Fractal backdrop"),
        1,
    )

    old_sv = """    function setVisualMode(mode) {
        if (mode !== 'points' && mode !== 'splatFull' && mode !== 'fractalMB' && mode !== 'fractalJulia') {
            mode = 'points';
        }
        visualMode = mode;
        if (!pointsObj) return;
        disposeSplatFullMesh();
        if (visualMode === 'splatFull') {
            if (fractalBackdropRig) fractalBackdropRig.visible = false;
            pointsObj.visible = false;
            rebuildSplatFullMesh(N, geom.attributes.position.array, geom.attributes.color.array);
        } else {
            ensureFractalBackdrop();
            if (fractalBackdropRig) {
                fractalBackdropRig.visible = visualMode === 'fractalMB' || visualMode === 'fractalJulia';
            }
            pointsObj.visible = visualMode !== 'fractalMB' && visualMode !== 'fractalJulia';
            pointsObj.material = pointsClassicMat;
            pointsMat = pointsClassicMat;
        }
    }"""
    new_sv = """    function setVisualMode(mode) {
        if (
            mode !== 'points' &&
            mode !== 'splatFull' &&
            mode !== 'fractalMB' &&
            mode !== 'fractalJulia' &&
            mode !== 'juliaWormhole'
        ) {
            mode = 'points';
        }
        var prevMode = visualMode;
        if (prevMode !== mode) {
            if (clock && typeof clock.start === 'function') {
                clock.start();
            }
            whDepth = 0;
            whPrevDepth = 0;
            whVelocitySm = 0;
        }
        visualMode = mode;
        if (!pointsObj) return;
        disposeSplatFullMesh();
        if (prevMode === 'juliaWormhole' && visualMode !== 'juliaWormhole') {
            wormholeRestoreSceneFog();
            if (wormholeRoot) wormholeRoot.visible = false;
            wormholeRingPulseT0 = -1;
            wormholeRingPulseStartScale = 1;
            wormholeRingPulseLoggedStart = false;
            wormholeRingPulsePeakLogCycle = -1;
            wormholeRingPulseLastSoloLogT = -1;
            if (typeof wormholeControls !== 'undefined') {
                wormholeControls.debugAnnulusOnly = false;
                wormholeControls.debugRingPulseLogs = false;
            }
        }
        if (visualMode === 'splatFull') {
            if (fractalBackdropRig) fractalBackdropRig.visible = false;
            pointsObj.visible = false;
            rebuildSplatFullMesh(N, geom.attributes.position.array, geom.attributes.color.array);
        } else {
            ensureFractalBackdrop();
            if (fractalBackdropRig) {
                fractalBackdropRig.visible = visualMode === 'fractalMB' || visualMode === 'fractalJulia';
            }
            var hideDisk =
                visualMode === 'fractalMB' ||
                visualMode === 'fractalJulia' ||
                visualMode === 'juliaWormhole';
            pointsObj.visible = !hideDisk;
            pointsObj.material = pointsClassicMat;
            pointsMat = pointsClassicMat;
            if (visualMode === 'juliaWormhole') {
                wormholeEnsureScene();
                if (wormholeRoot) {
                    wormholeRoot.visible = true;
                    wormholeRingPulseT0 = -1;
                    wormholeRingPulsePeakLogCycle = -1;
                }
            } else if (wormholeRoot) {
                wormholeRoot.visible = false;
            }
        }
    }"""
    if old_sv not in iife2:
        raise SystemExit("wormhole: setVisualMode anchor not found")
    iife2 = iife2.replace(old_sv, new_sv, 1)

    old_ag = """        var __whPu =
            typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                ? JULIA_WH_PORTAL_PRESETS[key]
                : null;
        if (__whPu) {
            if (
                typeof __cpIsAggressionAllowed === 'function' &&
                !__cpIsAggressionAllowed(key)
            ) {
                var _cpFbWhP =
                    typeof __cpFirstAllowedAggressionValue === 'function'
                        ? __cpFirstAllowedAggressionValue()
                        : 'balanced';
                if (aggressionSel) aggressionSel.value = _cpFbWhP;
                applyAggressionPreset(_cpFbWhP);
                return;
            }
            wormholeControls.juliaCx = __whPu.cx;
            wormholeControls.juliaCy = __whPu.cy;
            wormholeControls.juliaFrameZoom = __whPu.frameZoom;
            setVisualMode('juliaWormhole');
            refreshDatGuiDisplay(gui);
            if (wormholeGui) refreshDatGuiDisplay(wormholeGui);
            return;
        }
        if (key === 'fractalJulia') {
            if (typeof __cpIsAggressionAllowed === 'function' && !__cpIsAggressionAllowed('fractalJulia')) {
                var _cpFbJu = typeof __cpFirstAllowedAggressionValue === 'function' ? __cpFirstAllowedAggressionValue() : 'balanced';
                if (aggressionSel) aggressionSel.value = _cpFbJu;
                applyAggressionPreset(_cpFbJu);
                return;
            }
            fractalBackdropJuliaBaseCr = -0.355;
            fractalBackdropJuliaBaseCi = 0.595;
            setVisualMode('fractalJulia');
            refreshDatGuiDisplay(gui);
            return;
        }
        setVisualMode('points');"""
    new_ag = """        var __whPu =
            typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                ? JULIA_WH_PORTAL_PRESETS[key]
                : null;
        if (__whPu) {
            if (
                typeof __cpIsAggressionAllowed === 'function' &&
                !__cpIsAggressionAllowed(key)
            ) {
                var _cpFbWhP =
                    typeof __cpFirstAllowedAggressionValue === 'function'
                        ? __cpFirstAllowedAggressionValue()
                        : 'balanced';
                if (aggressionSel) aggressionSel.value = _cpFbWhP;
                applyAggressionPreset(_cpFbWhP);
                return;
            }
            wormholeControls.juliaCx = __whPu.cx;
            wormholeControls.juliaCy = __whPu.cy;
            wormholeControls.juliaFrameZoom = __whPu.frameZoom;
            var __whPrevJuliaPu =
                typeof window.__cpLastJuliaWhPreset === 'string'
                    ? window.__cpLastJuliaWhPreset
                    : null;
            window.__cpLastJuliaWhPreset = key;
            setVisualMode('juliaWormhole');
            if (
                typeof wormholeSceneBuilt !== 'undefined' &&
                wormholeSceneBuilt &&
                __whPrevJuliaPu != null &&
                __whPrevJuliaPu !== key &&
                typeof wormholeRebuildScene === 'function'
            ) {
                wormholeRebuildScene();
            } else if (
                typeof wormholeSceneBuilt !== 'undefined' &&
                wormholeSceneBuilt &&
                typeof wormholeApplyPickerColorsToShaders === 'function'
            ) {
                wormholeApplyPickerColorsToShaders();
            }
            if (typeof wormholeSyncFogFromControls === 'function') wormholeSyncFogFromControls();
            refreshDatGuiDisplay(gui);
            wormholeRefreshWormholeGui();
            return;
        }
        if (key === 'fractalJulia') {
            if (typeof __cpIsAggressionAllowed === 'function' && !__cpIsAggressionAllowed('fractalJulia')) {
                var _cpFbJu = typeof __cpFirstAllowedAggressionValue === 'function' ? __cpFirstAllowedAggressionValue() : 'balanced';
                if (aggressionSel) aggressionSel.value = _cpFbJu;
                applyAggressionPreset(_cpFbJu);
                return;
            }
            fractalBackdropJuliaBaseCr = -0.355;
            fractalBackdropJuliaBaseCi = 0.595;
            setVisualMode('fractalJulia');
            refreshDatGuiDisplay(gui);
            return;
        }
        if (key === 'juliaWormhole') {
            if (typeof __cpIsAggressionAllowed === 'function' && !__cpIsAggressionAllowed('juliaWormhole')) {
                var _cpFbWh =
                    typeof __cpFirstAllowedAggressionValue === 'function'
                        ? __cpFirstAllowedAggressionValue()
                        : 'balanced';
                if (aggressionSel) aggressionSel.value = _cpFbWh;
                applyAggressionPreset(_cpFbWh);
                return;
            }
            setVisualMode('juliaWormhole');
            if (
                typeof wormholeSceneBuilt !== 'undefined' &&
                wormholeSceneBuilt &&
                typeof wormholeApplyPickerColorsToShaders === 'function'
            ) {
                wormholeApplyPickerColorsToShaders();
            }
            if (typeof wormholeSyncFogFromControls === 'function') wormholeSyncFogFromControls();
            refreshDatGuiDisplay(gui);
            wormholeRefreshWormholeGui();
            return;
        }
        setVisualMode('points');"""
    if old_ag not in iife2:
        raise SystemExit("wormhole: applyAggressionPreset anchor not found")
    iife2 = iife2.replace(old_ag, new_ag, 1)

    fog_old = """        scene.fog.density = simControls.fogDensity;

        var arr = geom.attributes.position.array;
        var zScale = simControls.zExtrude;
        var tr = snap.transient || 0;
        var splatFullNow = visualMode === 'splatFull' && splatFullInstPos && splatFullInstCol;
        var spA = splatFullNow ? splatFullInstPos.array : null;
        var scA = splatFullNow ? splatFullInstCol.array : null;
        var fractalMB = visualMode === 'fractalMB';
        var fractalJulia = visualMode === 'fractalJulia';
        var fractalNow = fractalMB || fractalJulia;"""
    fog_new = """        if (visualMode !== 'juliaWormhole') {
            scene.fog.density = simControls.fogDensity;
        }

        var arr = geom.attributes.position.array;
        var zScale = simControls.zExtrude;
        var tr = snap.transient || 0;
        var splatFullNow = visualMode === 'splatFull' && splatFullInstPos && splatFullInstCol;
        var spA = splatFullNow ? splatFullInstPos.array : null;
        var scA = splatFullNow ? splatFullInstCol.array : null;
        var fractalMB = visualMode === 'fractalMB';
        var fractalJulia = visualMode === 'fractalJulia';
        var wormholeNow = visualMode === 'juliaWormhole';
        var fractalNow = (fractalMB || fractalJulia) && !wormholeNow;

        if (wormholeNow) {
            wormholeTickAudio(dt, lvl, tr, snap);
            wormholeTickVisual(dt, time, lvl, tr, snap);
        }
"""
    if fog_old not in iife2:
        raise SystemExit("wormhole: animate fog/fractal anchor not found")
    iife2 = iife2.replace(fog_old, fog_new, 1)

    if "        if (!fractalNow && !wormholeNow)" in iife2:
        pass
    else:
        iife2 = iife2.replace(
            "        if (!fractalNow) {",
            "        if (!fractalNow && !wormholeNow) {",
            1,
        )

    cam_old = """        var zCam = 2.5 - zoom * 0.75;
        camera.position.z += (zCam - camera.position.z) * 0.08;
        camera.position.x = 0;
        camera.position.y = 0.08;
        camera.lookAt(__cpLookTarget);

        var lobes = Math.max(2, Math.min(42, Math.round(Math.sqrt(hz / 20))));
        var fractalTag = fractalMB ? ' · Mandelbrot' : fractalJulia ? ' · Julia' : '';"""
    cam_new = """        if (wormholeNow) {
            camera.near = 0.1;
            camera.far += (600 - camera.far) * 0.14;
            camera.fov += (72 - camera.fov) * 0.12;
            camera.updateProjectionMatrix();
            var rollWh = wormholeRoot && wormholeRoot.userData._rm
                ? 0
                : Math.sin(time * 0.21) * 0.04 + whVelocitySm * 0.0015;
            camera.position.set(0, 0, 0);
            camera.rotation.set(0, 0, rollWh);
            camera.lookAt(new THREE.Vector3(0, 0, -1));
        } else {
            camera.near += (0.02 - camera.near) * 0.14;
            camera.far += (80 - camera.far) * 0.14;
            camera.fov += (48 - camera.fov) * 0.12;
            camera.updateProjectionMatrix();
            var zCam = 2.5 - zoom * 0.75;
            camera.position.z += (zCam - camera.position.z) * 0.08;
            camera.position.x = 0;
            camera.position.y = 0.08;
            camera.lookAt(__cpLookTarget);
        }

        var lobes = Math.max(2, Math.min(42, Math.round(Math.sqrt(hz / 20))));
        var __whReadout =
            wormholeNow &&
            typeof aggressionSel !== 'undefined' &&
            aggressionSel &&
            aggressionSel.value &&
            typeof JULIA_WH_PORTAL_READOUT_SUFFIX !== 'undefined'
                ? JULIA_WH_PORTAL_READOUT_SUFFIX[aggressionSel.value] || ''
                : '';
        var fractalTag = wormholeNow
            ? (' · Azura Shiva' + __whReadout)
            : fractalMB
                ? ' · Mandelbrot'
                : fractalJulia
                    ? ' · Julia'
                    : '';"""
    if cam_old not in iife2:
        raise SystemExit("wormhole: camera/readout anchor not found")
    iife2 = iife2.replace(cam_old, cam_new, 1)

    setup_insert = r"""    function wormholeRebuildScene() {
        var vis = visualMode === 'juliaWormhole';
        wormholeDisposeBuilt();
        if (vis) {
            wormholeEnsureScene();
            if (wormholeRoot) wormholeRoot.visible = true;
        }
        wormholeRefreshWormholeGui();
    }

    function wormholeRefreshWormholeGui() {
        if (!wormholeGui || typeof refreshDatGuiDisplay !== 'function') return;
        refreshDatGuiDisplay(wormholeGui);
        if (typeof wormholeGui.updateDisplay === 'function') {
            try {
                wormholeGui.updateDisplay();
            } catch (eWrg) {}
        }
        requestAnimationFrame(function () {
            refreshDatGuiDisplay(wormholeGui);
            if (typeof wormholeGui.updateDisplay === 'function') {
                try {
                    wormholeGui.updateDisplay();
                } catch (eWrg2) {}
            }
        });
    }

    function setupWormholeGui() {
        wormholeGui = new dat.GUI({ width: 300 });
        var wf = wormholeGui.addFolder('Audio flight');
        wf.add(wormholeControls, 'audioSensitivity', 0.0004, 0.006).name('scroll sensitivity');
        wf.add(wormholeControls, 'audioLevelFly', 0, 3).name('level → impulse');
        wf.add(wormholeControls, 'audioTransientFly', 0, 3).name('transients → impulse');
        wf.add(wormholeControls, 'audioBassFly', 0, 3).name('bass → impulse');
        wf.add(wormholeControls, 'idleForward', 0, 2).name('idle cruise v');
        wf.add(wormholeControls, 'idleForwardAudioMul', 0, 2).name('idle × (audio on)');
        wf.add(wormholeControls, 'scrollCoastTau', 12, 120).name('velocity coast τ');
        wf.add(wormholeControls, 'scrollFriction', 0.85, 0.995).name('friction / frame');
        wf.open();
        var wj = wormholeGui.addFolder('Julia orbit');
        wj.add(wormholeControls, 'juliaCx', -1.2, 1.2).name('c.x');
        wj.add(wormholeControls, 'juliaCy', -1.2, 1.2).name('c.y');
        wj.add(wormholeControls, 'discRadius', 0.02, 0.45).name('disc radius');
        wj.add(wormholeControls, 'fractalEvolutionSpeed', 0.2, 6).name('fractal evolution');
        wj.open();
        var wsky = wormholeGui.addFolder('Framed sky');
        wsky.add(wormholeControls, 'juliaFrameZoom', 0.6, 3).name('frame zoom');
        wsky.add(wormholeControls, 'juliaPulseAmount', 0, 0.35).name('pulse amount');
        wsky.add(wormholeControls, 'juliaParallaxAmount', 0, 0.12).name('parallax amount');
        wsky.add(wormholeControls, 'juliaRotationSpeed', 0, 0.25).name('rotation speed');
        wsky.add(wormholeControls, 'juliaRidgeStrength', 0, 1).name('ridge strength');
        wsky.add(wormholeControls, 'juliaPulseSpeed', 0.1, 1).name('pulse speed');
        wsky.add(wormholeControls, 'skyIntensity', 0.5, 2).name('sky intensity');
        wsky.open();
        var wt = wormholeGui.addFolder('Tunnel (rebuild on release)');
        wt.add(wormholeControls, 'ringCount', 12, 96).step(1).onFinishChange(wormholeRebuildScene);
        wt.add(wormholeControls, 'ringSpacing', 2, 12).step(0.5).onFinishChange(wormholeRebuildScene);
        wt.add(wormholeControls, 'ringRadius', 4, 14).onFinishChange(wormholeRebuildScene);
        wt.add(wormholeControls, 'helixCount', 0, 6).step(1).onFinishChange(wormholeRebuildScene);
        wt.add(wormholeControls, 'wormParticleCount', 200, 3200).step(50).onFinishChange(wormholeRebuildScene);
        wt.open();
        var wr = wormholeGui.addFolder('Ring shader');
        wr.add(wormholeControls, 'ringIntensity', 0.35, 2).name('ring intensity');
        wr.open();
        var wrp = wormholeGui.addFolder('Ring mesh pulse');
        wrp.add(wormholeControls, 'ringPulsePeakMul', 1, 2).step(0.02).name('peak scale ×');
        wrp.add(wormholeControls, 'ringPulseEndScale', 0.01, 0.2).step(0.002).name('min scale');
        wrp.add(wormholeControls, 'debugAnnulusOnly').name('debug annulus only');
        wrp.add(wormholeControls, 'debugRingPulseLogs').name('pulse console logs');
        wrp.open();
        var wm = wormholeGui.addFolder('Motion accents');
        wm.add(wormholeControls, 'helixFlareGain', 0, 2.5).name('helix flare gain');
        wm.add(wormholeControls, 'omStreamSpeed', 0, 0.2).name('Om stream × depth');
        wm.open();
        var wspir = wormholeGui.addFolder('Centre spirals');
        try {
            wspir.addColor(wormholeControls, 'whColorHelix').name('Colour A');
            wspir.addColor(wormholeControls, 'whColorHelixB').name('Colour B');
            wspir.add(wormholeControls, 'helixHueSpread', 0, 2).step(0.05).name('rainbow twist (0 = off)');
        } catch (eSpir) {
            wspir.add(wormholeControls, 'whColorHelix').name('spiral A hex');
            wspir.add(wormholeControls, 'whColorHelixB').name('spiral B hex');
            wspir.add(wormholeControls, 'helixHueSpread', 0, 2).step(0.05).name('rainbow twist');
        }
        wspir.open();
        var wgFog = wormholeGui.addFolder('Atmosphere');
        wgFog.add(wormholeControls, 'fogDensity', 0.004, 0.06).onChange(function () {
            wormholeSyncFogFromControls();
        });
        wgFog.open();
        var wc = wormholeGui.addFolder('Colors (wormhole)');
        try {
            wc.addColor(wormholeControls, 'whColorSky').name('framed sky');
            wc.addColor(wormholeControls, 'whColorRing').name('tunnel rings');
            wc.addColor(wormholeControls, 'whColorOm').name('Om sprites');
        } catch (eWC) {
            wc.add(wormholeControls, 'whColorSky').name('sky hex');
            wc.add(wormholeControls, 'whColorRing').name('rings hex');
            wc.add(wormholeControls, 'whColorOm').name('Om hex');
        }
        wc.open();
        var wpf = wormholeGui.addFolder('Fractal palette (wormhole)');
        try {
            wpf.addColor(wormholeControls, 'whJuliaFractColor').name('Julia fractal mono / techno');
        } catch (eWJ) {
            wpf.add(wormholeControls, 'whJuliaFractColor').name('Julia fractal hex');
        }
        wpf.open();
        var wAct = {
            reset: function () {
                wormholeControls.audioLevelFly = 1.35;
                wormholeControls.audioTransientFly = 1.05;
                wormholeControls.audioBassFly = 0.62;
                wormholeControls.audioSensitivity = 0.0015;
                wormholeControls.idleForwardAudioMul = 1;
                wormholeControls.idleForward = 1.0;
                wormholeControls.scrollCoastTau = 60;
                wormholeControls.scrollFriction = 0.92;
                wormholeControls.juliaCx = -0.7269;
                wormholeControls.juliaCy = 0.1889;
                wormholeControls.helixFlareGain = 1.0;
                wormholeControls.juliaFrameZoom = 1.5;
                wormholeControls.juliaPulseAmount = 0.1;
                wormholeControls.juliaParallaxAmount = 0.04;
                wormholeControls.juliaRotationSpeed = 0.085;
                wormholeControls.juliaRidgeStrength = 0.09;
                wormholeControls.juliaPulseSpeed = 0.4;
                wormholeControls.omStreamSpeed = 0.011;
                wormholeControls.fractalEvolutionSpeed = 3.0;
                wormholeControls.discRadius = 0.24;
                wormholeControls.ringRadius = 8;
                wormholeControls.ringSpacing = 4;
                wormholeControls.ringCount = 72;
                wormholeControls.helixCount = 3;
                wormholeControls.wormParticleCount = 2400;
                wormholeControls.fogDensity = 0.02;
                wormholeControls.ringIntensity = 1.08;
                wormholeControls.ringPulsePeakMul = 1.0;
                wormholeControls.ringPulseEndScale = 0.03;
                wormholeControls.debugAnnulusOnly = false;
                wormholeControls.debugRingPulseLogs = false;
                wormholeControls.skyIntensity = 1.12;
                wormholeControls.whColorSky = '#8888ff';
                wormholeControls.whColorRing = '#0000b8';
                wormholeControls.whColorHelix = '#2222ff';
                wormholeControls.whColorHelixB = '#6666ff';
                wormholeControls.helixHueSpread = 0;
                wormholeControls.whColorOm = '#5555ff';
                wormholeControls.whJuliaFractColor = '#1818ff';
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    aggressionSel.value === 'juliaWH_spiral'
                ) {
                    var rdP =
                        typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESETS.juliaWH_spiral
                            : null;
                    if (rdP) {
                        wormholeControls.juliaCx = rdP.cx;
                        wormholeControls.juliaCy = rdP.cy;
                        wormholeControls.juliaFrameZoom = rdP.frameZoom;
                    }
                    var rdT =
                        typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESET_TUNING.juliaWH_spiral
                            : null;
                    if (rdT) wormholeApplySnapshot(rdT);
                }
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    aggressionSel.value === 'juliaWH_sanMarco'
                ) {
                    var rhP =
                        typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESETS.juliaWH_sanMarco
                            : null;
                    if (rhP) {
                        wormholeControls.juliaCx = rhP.cx;
                        wormholeControls.juliaCy = rhP.cy;
                        wormholeControls.juliaFrameZoom = rhP.frameZoom;
                    }
                    var rhT =
                        typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESET_TUNING.juliaWH_sanMarco
                            : null;
                    if (rhT) wormholeApplySnapshot(rhT);
                }
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    aggressionSel.value === 'juliaWH_recursive'
                ) {
                    var saP =
                        typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESETS.juliaWH_recursive
                            : null;
                    if (saP) {
                        wormholeControls.juliaCx = saP.cx;
                        wormholeControls.juliaCy = saP.cy;
                        wormholeControls.juliaFrameZoom = saP.frameZoom;
                    }
                    var saT =
                        typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESET_TUNING.juliaWH_recursive
                            : null;
                    if (saT) wormholeApplySnapshot(saT);
                }
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    aggressionSel.value === 'juliaWH_cauliflower'
                ) {
                    var gtfP =
                        typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESETS.juliaWH_cauliflower
                            : null;
                    if (gtfP) {
                        wormholeControls.juliaCx = gtfP.cx;
                        wormholeControls.juliaCy = gtfP.cy;
                        wormholeControls.juliaFrameZoom = gtfP.frameZoom;
                    }
                    var gtfT =
                        typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESET_TUNING.juliaWH_cauliflower
                            : null;
                    if (gtfT) wormholeApplySnapshot(gtfT);
                }
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    aggressionSel.value === 'juliaWH_dendrite'
                ) {
                    var cmP =
                        typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESETS.juliaWH_dendrite
                            : null;
                    if (cmP) {
                        wormholeControls.juliaCx = cmP.cx;
                        wormholeControls.juliaCy = cmP.cy;
                        wormholeControls.juliaFrameZoom = cmP.frameZoom;
                    }
                    var cmT =
                        typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESET_TUNING.juliaWH_dendrite
                            : null;
                    if (cmT) wormholeApplySnapshot(cmT);
                }
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    aggressionSel.value === 'juliaWH_airplane'
                ) {
                    var gpP =
                        typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESETS.juliaWH_airplane
                            : null;
                    if (gpP) {
                        wormholeControls.juliaCx = gpP.cx;
                        wormholeControls.juliaCy = gpP.cy;
                        wormholeControls.juliaFrameZoom = gpP.frameZoom;
                    }
                    var gpT =
                        typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESET_TUNING.juliaWH_airplane
                            : null;
                    if (gpT) wormholeApplySnapshot(gpT);
                }
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    aggressionSel.value === 'juliaWH_rabbit'
                ) {
                    var fvP =
                        typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESETS.juliaWH_rabbit
                            : null;
                    if (fvP) {
                        wormholeControls.juliaCx = fvP.cx;
                        wormholeControls.juliaCy = fvP.cy;
                        wormholeControls.juliaFrameZoom = fvP.frameZoom;
                    }
                    var fvT =
                        typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESET_TUNING.juliaWH_rabbit
                            : null;
                    if (fvT) wormholeApplySnapshot(fvT);
                }
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    aggressionSel.value === 'juliaWH_siegel'
                ) {
                    var sgP =
                        typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESETS.juliaWH_siegel
                            : null;
                    if (sgP) {
                        wormholeControls.juliaCx = sgP.cx;
                        wormholeControls.juliaCy = sgP.cy;
                        wormholeControls.juliaFrameZoom = sgP.frameZoom;
                    }
                    var sgT =
                        typeof JULIA_WH_PORTAL_PRESET_TUNING !== 'undefined'
                            ? JULIA_WH_PORTAL_PRESET_TUNING.juliaWH_siegel
                            : null;
                    if (sgT) wormholeApplySnapshot(sgT);
                }
                whDepth = 0;
                whPrevDepth = 0;
                whVelocitySm = 0;
                wormholeRebuildScene();
                if (
                    typeof aggressionSel !== 'undefined' &&
                    aggressionSel &&
                    typeof wormholeIsJuliaTunnelKey === 'function' &&
                    wormholeIsJuliaTunnelKey(aggressionSel.value)
                ) {
                    wormholeControlsSnapshots[aggressionSel.value] = wormholeCaptureSnapshot();
                }
            }
        };
        wormholeGui.add(wAct, 'reset').name('Reset defaults (zip)');
        if (typeof attachMovableDatGui === 'function') {
            var _whHost = document.getElementById('wormholeControlsHost');
            attachMovableDatGui(
                wormholeGui,
                _whHost
                    ? {
                        title: 'Wormhole controls',
                        parent: _whHost,
                        startMinimized: true,
                        embeddedMaxHeight: 'min(92vh, 900px)',
                    }
                    : {
                        title: 'Wormhole controls',
                        initialRight: 24,
                        initialTop: 320,
                        zIndex: 499,
                        startMinimized: true,
                    }
            );
            if (typeof __pmFsMountWormholeGui === 'function') {
                __pmFsMountWormholeGui();
            }
        }
    }

"""
    sg_anchor = "    function setupGui() {"
    if sg_anchor not in iife2:
        raise SystemExit("wormhole: setupGui anchor not found")
    iife2 = iife2.replace(sg_anchor, setup_insert + sg_anchor, 1)

    call_old = """    setupGui();
    if (aggressionSel) {"""
    call_new = """    setupGui();
    setupWormholeGui();
    if (aggressionSel) {"""
    if call_old not in iife2:
        raise SystemExit("wormhole: setupGui(); callsite not found")
    iife2 = iife2.replace(call_old, call_new, 1)

    sub_old = """        var allowFractalVisuals =
            ag == null
                ? true
                : ag.indexOf('fractalMB') >= 0 || ag.indexOf('fractalJulia') >= 0;"""
    sub_new = """        var allowFractalVisuals =
            ag == null
                ? true
                : ag.indexOf('fractalMB') >= 0 ||
                    ag.indexOf('fractalJulia') >= 0 ||
                    ag.indexOf('juliaWormhole') >= 0;"""
    if sub_old in iife2:
        iife2 = iife2.replace(sub_old, sub_new, 1)

    wrap_old = """        refreshDatGuiDisplay(gui);
    }

    function wormholeRebuildScene() {"""

    wrap_new = """        refreshDatGuiDisplay(gui);
    }

    (function wormholePatchApplyAggressionSnapshotWrap() {
        if (typeof applyAggressionPreset !== 'function') return;
        var wormholeAggWrapDepth = 0;
        var wormholeOrigApplyAggressionPreset = applyAggressionPreset;
        applyAggressionPreset = function (key) {
            if (wormholeAggWrapDepth === 0 && typeof wormholeOnAggressionPresetBefore === 'function') {
                wormholeOnAggressionPresetBefore(key);
            }
            wormholeAggWrapDepth++;
            try {
                return wormholeOrigApplyAggressionPreset(key);
            } finally {
                wormholeAggWrapDepth--;
            }
        };
    })();

    function wormholeRebuildScene() {"""

    if wrap_old not in iife2:
        raise SystemExit("wormhole: applyAggressionPreset / wormholeRebuildScene anchor not found")
    iife2 = iife2.replace(wrap_old, wrap_new, 1)

    return iife2
