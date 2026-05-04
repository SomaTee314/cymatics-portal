(function () {
    var BG = 0x030508;

    var palette = {
        colorLow: '#0a2858',
        colorMid: '#ffb84d',
        colorHigh: '#55f8ff'
    };

    var PRESETS = [
        { name: '— Choose preset —', hz: 0 },
        { name: 'Solfeggio 174 Hz', hz: 174 },
        { name: 'Solfeggio 285 Hz', hz: 285 },
        { name: 'Solfeggio 396 Hz', hz: 396 },
        { name: 'Solfeggio 417 Hz', hz: 417 },
        { name: '432 Hz (Verdi / cosmic tuning)', hz: 432 },
        { name: 'Solfeggio 528 Hz', hz: 528 },
        { name: 'Solfeggio 639 Hz', hz: 639 },
        { name: 'Solfeggio 741 Hz', hz: 741 },
        { name: 'Solfeggio 852 Hz', hz: 852 },
        { name: 'Solfeggio 963 Hz', hz: 963 },
        { name: 'Schumann fundamental ~7.83 Hz', hz: 7.83 },
        { name: 'Alpha bridge 12 Hz', hz: 12 },
        { name: '40 Hz (gamma-band focus)', hz: 40 },
        { name: '136.1 Hz (Om / reference)', hz: 136.1 },
        { name: 'A4 concert 440 Hz', hz: 440 },
        { name: '1000 Hz (calibration)', hz: 1000 },
        { name: '10000 Hz (air band)', hz: 10000 }
    ];

    /** Tone oscillator trim (linear); master headroom node avoids clipping on peaks. */
    var TONE_BRANCH_TRIM = 0.21;
    var MASTER_HEADROOM_GAIN = 0.9;

    /** Upper cap: push until the GPU stutters; hash e.g. #particles=200000 still honoured within cap */
    var PARTICLE_MIN = 2500;
    var PARTICLE_CAP = 320000;

    function particleClamp(n) {
        n = Math.round(parseFloat(n)) || 0;
        return Math.min(PARTICLE_CAP, Math.max(PARTICLE_MIN, n));
    }

    function particleGoal() {
        var m = window.location.hash.match(/particles=(\d+)/i);
        var n = m ? parseInt(m[1], 10) : 111111;
        return particleClamp(n);
    }

    var selPreset = document.getElementById('presetSel');
    PRESETS.forEach(function (p, i) {
        var o = document.createElement('option');
        o.value = String(i);
        o.textContent = p.name;
        selPreset.appendChild(o);
    });

    var modeSel = document.getElementById('modeSel');
    var freqDial = document.getElementById('freqDial');
    var freqNum = document.getElementById('freqNum');
    var trackRow = document.getElementById('trackRow');
    var presetRow = document.getElementById('presetRow');
    var fileIn = document.getElementById('fileIn');
    var btnAudio = document.getElementById('btnAudio');
    var btnStop = document.getElementById('btnStop');
    var trackTransportRow = document.getElementById('trackTransportRow');
    var btnTrackPause = document.getElementById('btnTrackPause');
    var trackSeekSlider = document.getElementById('trackSeekSlider');
    var trackSeekDragging = false;
    var trackTimeLabel = document.getElementById('trackTimeLabel');
    var volSlider = document.getElementById('volSlider');
    var aggressionSel = document.getElementById('aggressionSel');
    var particleSlider = document.getElementById('particleSlider');
    var particleNum = document.getElementById('particleNum');
    var particleCapLabel = document.getElementById('particleCapLabel');
    var readout = document.getElementById('readout');
/**
 * Injected into the Cymatics portal IIFE. Parent Next.js shell posts { type: 'cp-subscription', ... };
 * standalone /cymatics.html uses free-tier defaults; if no parent message within 3s, state is pinned to free.
 */
    var __CP_LOCK = ' \uD83D\uDD12';
    var __CP_UPGRADE_TIP = 'Upgrade to Pro';

    window.__CP_SUB_STATE = window.__CP_SUB_STATE || null;
    window.__CP_SUB_RECEIVED_FROM_PARENT = false;

    var __cpSessionTimerId = null;
    var __cpFallbackTimer = null;
    var __cpLastSubSignature = null;

    function __cpIsAllowedOrigin(origin) {
        try {
            if (!origin || origin === 'null') return false;
            if (origin === window.location.origin) return true;
            var u = new URL(origin);
            if (u.protocol === 'https:' && /\.vercel\.app$/i.test(u.hostname)) return true;
            var meta = document.querySelector('meta[name="cp-postmessage-origins"]');
            if (meta && meta.content) {
                var parts = meta.content.split(/[\s,]+/);
                var i;
                for (i = 0; i < parts.length; i++) {
                    if (parts[i] === origin) return true;
                }
            }
        } catch (e0) {}
        return false;
    }

    function __cpSubEffective() {
        var d = window.__CP_SUB_STATE;
        if (d && d.isDevMode) {
            return {
                tier: d.tier || 'creator',
                isDevMode: true,
                allowFractalVisuals: true,
                allowMic: true,
                allowCustomHz: true,
                allowedPresetIndices: null,
                exportWatermark: false,
                sessionMinutes: null,
                allowedAggressionValues: null
            };
        }
        if (!d) {
            return {
                tier: 'free',
                isDevMode: false,
                allowFractalVisuals: true,
                allowMic: false,
                allowCustomHz: false,
                allowedPresetIndices: [0, 5, 6],
                exportWatermark: true,
                sessionMinutes: 15,
                allowedAggressionValues: ['fractalJulia']
            };
        }
        var ag = d.allowedAggressionValues;
        if (ag === undefined) {
            ag = d.allowFractalVisuals ? null : ['balanced'];
        }
        var allowFractalVisuals =
            ag == null
                ? true
                : ag.indexOf('fractalMB') >= 0 ||
                    ag.indexOf('fractalJulia') >= 0 ||
                    ag.indexOf('juliaWormhole') >= 0;
        return {
            tier: d.tier || 'free',
            isDevMode: false,
            allowFractalVisuals: allowFractalVisuals,
            allowMic: !!d.allowMic,
            allowCustomHz: !!d.allowCustomHz,
            allowedPresetIndices:
                d.allowedPresetIndices === undefined ? null : d.allowedPresetIndices,
            exportWatermark: !!d.exportWatermark,
            sessionMinutes:
                d.sessionMinutes !== undefined && d.sessionMinutes !== null
                    ? d.sessionMinutes
                    : null,
            allowedAggressionValues: ag
        };
    }

    function __cpSubscriptionSignature(data) {
        try {
            return JSON.stringify({
                tier: data.tier || 'free',
                allowedPresetIndices: data.allowedPresetIndices,
                allowedAggressionValues: data.allowedAggressionValues,
                sessionMinutes: data.sessionMinutes,
                isDevMode: !!data.isDevMode,
                allowFractalVisuals: !!data.allowFractalVisuals,
                allowMic: !!data.allowMic,
                allowCustomHz: !!data.allowCustomHz,
                exportWatermark: !!data.exportWatermark
            });
        } catch (eSig) {
            return null;
        }
    }

    function __cpClearSessionTimer() {
        if (__cpSessionTimerId) {
            clearTimeout(__cpSessionTimerId);
            __cpSessionTimerId = null;
        }
    }

    function __cpRestartSessionTimer() {
        __cpClearSessionTimer();
        var se = __cpSubEffective();
        if (se.isDevMode) return;
        var lim = se.sessionMinutes;
        if (lim == null || lim <= 0) return;
        __cpSessionTimerId = setTimeout(function () {
            __cpSessionTimerId = null;
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage(
                        { type: 'cp-action', action: 'session-expired' },
                        '*'
                    );
                }
            } catch (e1) {}
        }, lim * 60 * 1000);
    }

    function __cpPresetBaseLabel(opt) {
        var base = opt.getAttribute('data-cp-label');
        if (base != null && base !== '') return base;
        base = opt.text.replace(/\s*\uD83D\uDD12\s*$/u, '').trim();
        opt.setAttribute('data-cp-label', base);
        return base;
    }

    function __cpAggroBaseLabel(opt) {
        var b = opt.getAttribute('data-cp-aggro-label');
        if (b != null && b !== '') return b;
        b = opt.text.replace(/\s*\uD83D\uDD12\s*$/u, '').trim();
        opt.setAttribute('data-cp-aggro-label', b);
        return b;
    }

    function __cpFirstAllowedAggressionInList(allow) {
        if (!allow || !allow.length) return 'balanced';
        if (allow.indexOf('fractalJulia') >= 0) return 'fractalJulia';
        return allow[0];
    }

    /** Map aggressionSel values onto tier allow-list ids (all `juliaWH_*` presets unlock with `juliaWormhole`). */
    function __cpNormalizeAggressionTierKey(key) {
        if (
            key === 'juliaWormhole' ||
            (typeof key === 'string' && key.indexOf('juliaWH_') === 0)
        ) {
            return 'juliaWormhole';
        }
        return key;
    }

    /** Legacy option removed from HTML — map to rabbit preset key. */
    function __cpMigrateAggressionPortalSelect() {
        if (!aggressionSel || aggressionSel.value !== 'fractalJuliaDouady') return;
        var i;
        for (i = 0; i < aggressionSel.options.length; i++) {
            if (aggressionSel.options[i].value === 'juliaWH_rabbit') {
                aggressionSel.value = 'juliaWH_rabbit';
                return;
            }
        }
        aggressionSel.value = 'juliaWormhole';
    }

    function __cpAggressionValueAllowed(optionValue, allowList) {
        if (!allowList || !allowList.length) return true;
        if (allowList.indexOf(optionValue) >= 0) return true;
        var tierKey = __cpNormalizeAggressionTierKey(optionValue);
        return allowList.indexOf(tierKey) >= 0;
    }

    window.__cpIsAggressionAllowed = function (key) {
        var se = __cpSubEffective();
        if (se.isDevMode) return true;
        var a = se.allowedAggressionValues;
        if (a == null) return true;
        var k = __cpNormalizeAggressionTierKey(key);
        return a.indexOf(k) >= 0;
    };
    window.__cpFirstAllowedAggressionValue = function () {
        var se = __cpSubEffective();
        if (se.isDevMode || se.allowedAggressionValues == null) {
            return 'fractalJulia';
        }
        return __cpFirstAllowedAggressionInList(se.allowedAggressionValues);
    };

    function __cpApplyPresetOptionsGate() {
        if (!selPreset) return;
        var se = __cpSubEffective();
        var allow = se.allowedPresetIndices;
        var i;
        if (se.isDevMode || allow == null) {
            for (i = 0; i < selPreset.options.length; i++) {
                var o = selPreset.options[i];
                o.disabled = false;
                o.text = __cpPresetBaseLabel(o);
                o.style.opacity = '';
            }
            return;
        }
        for (i = 0; i < selPreset.options.length; i++) {
            var opt = selPreset.options[i];
            var idx = parseInt(opt.value, 10);
            var ok = allow.indexOf(idx) >= 0;
            opt.disabled = false;
            var base = __cpPresetBaseLabel(opt);
            if (!ok && !se.isDevMode) {
                opt.text = base + __CP_LOCK;
                opt.style.opacity = '0.5';
            } else {
                opt.text = base;
                opt.style.opacity = '';
            }
        }
        var cur = parseInt(selPreset.value, 10) || 0;
        if (allow.indexOf(cur) < 0) {
            selPreset.value = String(
                allow.indexOf(6) >= 0 ? 6 : allow.indexOf(5) >= 0 ? 5 : allow[0]
            );
            try {
                selPreset.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e2) {}
        }
    }

    function __cpApplyAggressionSelectGate() {
        if (!aggressionSel) return;
        var se = __cpSubEffective();
        var i;
        var allow = se.allowedAggressionValues;
        if (se.isDevMode || allow == null) {
            for (i = 0; i < aggressionSel.options.length; i++) {
                var o0 = aggressionSel.options[i];
                o0.disabled = false;
                o0.title = '';
                o0.text = __cpAggroBaseLabel(o0);
            }
        } else {
            for (i = 0; i < aggressionSel.options.length; i++) {
                var opt = aggressionSel.options[i];
                var ok = __cpAggressionValueAllowed(opt.value, allow);
                opt.disabled = false;
                var base = __cpAggroBaseLabel(opt);
                if (!ok) {
                    opt.text = base + __CP_LOCK;
                    opt.title = __CP_UPGRADE_TIP;
                } else {
                    opt.text = base;
                    opt.title = '';
                }
            }
        }
        if (
            allow &&
            allow.length &&
            !__cpAggressionValueAllowed(aggressionSel.value, allow)
        ) {
            aggressionSel.value = __cpFirstAllowedAggressionInList(allow);
            try {
                aggressionSel.dispatchEvent(
                    new Event('change', { bubbles: true })
                );
            } catch (eAg0) {}
        }
    }

    function __cpApplyModeOptionGate() {
        if (!modeSel) return;
        var se = __cpSubEffective();
        var i;
        for (i = 0; i < modeSel.options.length; i++) {
            var opt = modeSel.options[i];
            if (opt.value === 'track') {
                opt.disabled = false;
                opt.title =
                    !se.allowMic && !se.isDevMode ? __CP_UPGRADE_TIP : '';
            } else if (opt.value === 'manual') {
                opt.disabled = false;
                opt.title =
                    !se.allowCustomHz && !se.isDevMode ? __CP_UPGRADE_TIP : '';
            } else {
                opt.disabled = false;
                opt.title = '';
            }
        }
    }

    function __cpApplyModeGate() {
        if (!modeSel) return;
        var se = __cpSubEffective();
        if (!se.allowMic && modeSel.value === 'track') {
            modeSel.value = 'preset';
            try {
                modeSel.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e3) {}
            return;
        }
        if (!se.allowCustomHz && modeSel.value === 'manual') {
            modeSel.value = 'preset';
            try {
                modeSel.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e4) {}
        }
    }

    function __cpClampManualFrequency() {
        if (!freqDial || !freqNum || !modeSel) return;
        var se = __cpSubEffective();
        if (se.allowCustomHz || modeSel.value !== 'manual') return;
        var v = parseInt(freqDial.value, 10) || 528;
        if (v !== 432 && v !== 528) {
            v = Math.abs(v - 432) < Math.abs(v - 528) ? 432 : 528;
            freqDial.value = v;
            freqNum.value = v;
        }
    }

    var __cpGatedSelectAttached = false;
    var __cpIgnoreModeChange = false;
    var __cpIgnoreAggroChange = false;
    var __cpIgnorePresetChange = false;
    var __cpLastGatedPresetValue = null;
    var __cpLastGatedAggressionValue = null;

    function __cpPostSignupPrompt() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(
                    { type: 'cp-action', action: 'signup-prompt' },
                    '*'
                );
            }
        } catch (ePsp) {}
    }

    function __cpAttachGatedSelectListeners() {
        if (__cpGatedSelectAttached) return;
        if (!aggressionSel || !modeSel || !selPreset) return;
        __cpGatedSelectAttached = true;
        __cpLastGatedPresetValue = selPreset.value;
        __cpLastGatedAggressionValue = aggressionSel.value;

        aggressionSel.addEventListener('change', function () {
            if (__cpIgnoreAggroChange) return;
            var se = __cpSubEffective();
            var allow = se.allowedAggressionValues;
            if (se.isDevMode || allow == null) {
                __cpLastGatedAggressionValue = aggressionSel.value;
                return;
            }
            var v = aggressionSel.value;
            if (__cpAggressionValueAllowed(v, allow)) {
                __cpLastGatedAggressionValue = v;
                return;
            }
            __cpIgnoreAggroChange = true;
            var back =
                __cpLastGatedAggressionValue &&
                __cpAggressionValueAllowed(__cpLastGatedAggressionValue, allow)
                    ? __cpLastGatedAggressionValue
                    : __cpFirstAllowedAggressionInList(allow);
            aggressionSel.value = back;
            if (typeof applyAggressionPreset === 'function') {
                applyAggressionPreset(back);
            } else {
                try {
                    aggressionSel.dispatchEvent(
                        new Event('change', { bubbles: true })
                    );
                } catch (eAg) {}
            }
            __cpIgnoreAggroChange = false;
            __cpPostSignupPrompt();
        });

        modeSel.addEventListener('change', function () {
            if (__cpIgnoreModeChange) return;
            var se = __cpSubEffective();
            if (se.isDevMode) return;
            var v = modeSel.value;
            if (!se.allowMic && v === 'track') {
                __cpIgnoreModeChange = true;
                modeSel.value = 'preset';
                try {
                    modeSel.dispatchEvent(new Event('change', { bubbles: true }));
                } catch (eMs) {}
                __cpIgnoreModeChange = false;
                __cpPostSignupPrompt();
                return;
            }
            if (!se.allowCustomHz && v === 'manual') {
                __cpIgnoreModeChange = true;
                modeSel.value = 'preset';
                try {
                    modeSel.dispatchEvent(new Event('change', { bubbles: true }));
                } catch (eMs2) {}
                __cpIgnoreModeChange = false;
                __cpPostSignupPrompt();
            }
        });

        selPreset.addEventListener('change', function () {
            if (__cpIgnorePresetChange) return;
            var se = __cpSubEffective();
            var allow = se.allowedPresetIndices;
            if (se.isDevMode || allow == null) {
                __cpLastGatedPresetValue = selPreset.value;
                return;
            }
            var cur = parseInt(selPreset.value, 10) || 0;
            if (allow.indexOf(cur) >= 0) {
                __cpLastGatedPresetValue = selPreset.value;
                return;
            }
            __cpIgnorePresetChange = true;
            selPreset.value = __cpLastGatedPresetValue || String(allow[0]);
            try {
                selPreset.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (ePr) {}
            __cpIgnorePresetChange = false;
            __cpPostSignupPrompt();
        });
    }

    /**
     * After free-tier gating, HTML defaults and early gate passes may leave preset + balanced.
     * Once subscription unlocks (trial/pro/etc.), restore the intended product defaults.
     */
    function __cpApplyUnlockedProductDefaults() {
        var se = __cpSubEffective();
        if (!se.allowMic || se.allowedAggressionValues != null) {
            return;
        }
        if (!modeSel || !aggressionSel) {
            return;
        }
        if (modeSel.value !== 'track') {
            modeSel.value = 'track';
            try {
                modeSel.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (eCh0) {
                /* no-op */
            }
        }
        if (
            aggressionSel.value !== 'fractalJulia' &&
            __cpNormalizeAggressionTierKey(aggressionSel.value) !== 'juliaWormhole'
        ) {
            aggressionSel.value = 'fractalJulia';
            try {
                aggressionSel.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (eCh1) {
                /* no-op */
            }
        }
    }

    window.__cpApplySubscriptionGates = function () {
        __cpMigrateAggressionPortalSelect();
        var prevAggression = aggressionSel ? aggressionSel.value : null;
        __cpApplyPresetOptionsGate();
        __cpApplyAggressionSelectGate();
        __cpApplyModeOptionGate();
        __cpApplyModeGate();
        __cpClampManualFrequency();
        var nextAggression = aggressionSel ? aggressionSel.value : null;
        /* Only sync simControls / visual mode when the selector actually changed — avoids
           re-applying balanced preset + full dat.GUI refresh on every duplicate postMessage. */
        if (
            prevAggression !== nextAggression &&
            aggressionSel &&
            typeof applyAggressionPreset === 'function' &&
            typeof AGGRESSION_PRESETS !== 'undefined' &&
            AGGRESSION_PRESETS
        ) {
            applyAggressionPreset(aggressionSel.value);
        }
        __cpApplyUnlockedProductDefaults();
        __cpRestartSessionTimer();
        if (selPreset) {
            __cpLastGatedPresetValue = selPreset.value;
        }
        if (aggressionSel) {
            var sea = __cpSubEffective().allowedAggressionValues;
            if (
                sea == null ||
                __cpAggressionValueAllowed(aggressionSel.value, sea)
            ) {
                __cpLastGatedAggressionValue = aggressionSel.value;
            } else {
                __cpLastGatedAggressionValue = __cpFirstAllowedAggressionInList(
                    sea
                );
            }
        }
        __cpAttachGatedSelectListeners();
    };

    window.addEventListener('message', function (ev) {
        try {
            if (!__cpIsAllowedOrigin(ev.origin)) return;
            var data = ev.data;
            if (!data || data.type !== 'cp-subscription') return;
            var sig = __cpSubscriptionSignature(data);
            if (sig && sig === __cpLastSubSignature) {
                return;
            }
            __cpLastSubSignature = sig;
            window.__CP_SUB_RECEIVED_FROM_PARENT = true;
            if (__cpFallbackTimer) {
                clearTimeout(__cpFallbackTimer);
                __cpFallbackTimer = null;
            }
            window.__CP_SUB_STATE = {
                tier: data.tier || 'free',
                features: data.features || {},
                allowedPresetIndices:
                    data.allowedPresetIndices !== undefined
                        ? data.allowedPresetIndices
                        : null,
                allowedAggressionValues:
                    data.allowedAggressionValues !== undefined
                        ? data.allowedAggressionValues
                        : undefined,
                sessionMinutes:
                    data.sessionMinutes !== undefined
                        ? data.sessionMinutes
                        : null,
                isDevMode: !!data.isDevMode,
                allowFractalVisuals: !!data.allowFractalVisuals,
                allowMic: !!data.allowMic,
                allowCustomHz: !!data.allowCustomHz,
                exportWatermark: !!data.exportWatermark
            };
            if (window.__CP_SUB_STATE.isDevMode) {
                console.info(
                    '[CymaticsPortal] Full feature unlock (dev) — tier: creator. To test free-tier / subscriptions locally: set NEXT_PUBLIC_DEV_MODE=false and NEXT_PUBLIC_FORCE_SUBSCRIPTION_GATES=true, then restart next dev.'
                );
            }
            window.__cpApplySubscriptionGates();
        } catch (e6) {}
    });

    __cpFallbackTimer = setTimeout(function () {
        if (window.__CP_SUB_RECEIVED_FROM_PARENT) return;
        window.__CP_SUB_STATE = {
            tier: 'free',
            isDevMode: false,
            features: {},
            allowedPresetIndices: [0, 5, 6],
            sessionMinutes: 15,
            allowedAggressionValues: ['fractalJulia'],
            allowFractalVisuals: true,
            allowMic: false,
            allowCustomHz: false,
            exportWatermark: true
        };
        window.__cpApplySubscriptionGates();
    }, 3000);

    window.__cpApplySubscriptionGates();

    if (freqDial) {
        freqDial.addEventListener('input', function () {
            setTimeout(__cpClampManualFrequency, 0);
        });
    }
    if (freqNum) {
        freqNum.addEventListener('change', function () {
            setTimeout(__cpClampManualFrequency, 0);
        });
    }
    function syncFreqFromDial() {
        var v = Math.max(1, Math.min(25000, parseInt(freqDial.value, 10) || 1));
        freqDial.value = v;
        freqNum.value = v;
        return v;
    }
    function syncDialFromNum() {
        var v = Math.max(1, Math.min(25000, parseInt(freqNum.value, 10) || 1));
        freqNum.value = v;
        freqDial.value = v;
        return v;
    }

    /**
     * Map inaudible / barely audible fundamentals to a clear speaker-friendly band.
     * Visualization still uses the true preset Hz from PRESETS (driveFrequencyAndLevel).
     */
    function presetToAudibleCarrierHz(phz) {
        var lo = 112;
        var hi = 224;
        var u = (Math.log(phz) - Math.log(3.5)) / (Math.log(50) - Math.log(3.5));
        u = Math.max(0, Math.min(1, u));
        return lo + u * (hi - lo);
    }

    /** Raw healing frequency from preset (Hz), or 0 if not applicable. */
    function getPresetHealingHz() {
        if (modeSel.value !== 'preset') return 0;
        var pi = parseInt(selPreset.value, 10) || 0;
        var phz = PRESETS[pi] && PRESETS[pi].hz;
        return phz > 0 ? phz : 0;
    }

    /** Oscillator pitch: exact preset/manual Hz unless sub-bass — then audible carrier. */
    function getToneHzForAudio() {
        if (modeSel.value === 'preset') {
            var pi = parseInt(selPreset.value, 10) || 0;
            var phz = PRESETS[pi] && PRESETS[pi].hz;
            if (phz > 0) {
                var raw = Math.max(1, Math.min(20000, phz));
                if (raw < 52) return presetToAudibleCarrierHz(raw);
                return raw;
            }
        }
        if (modeSel.value === 'manual') {
            var d = Math.max(1, Math.min(25000, parseInt(freqDial.value, 10) || 1));
            if (d < 52) return presetToAudibleCarrierHz(d);
        }
        return syncFreqFromDial();
    }

    /** Mild lift only when carrier is still low (manual edge cases). */
    function lowFreqGainMul(hz) {
        hz = Math.max(1, hz);
        return hz < 88 ? Math.min(1.5, Math.sqrt(88 / hz)) : 1;
    }

    freqDial.addEventListener('input', function () { syncFreqFromDial(); onFreqUiChange(); });
    freqNum.addEventListener('change', function () { syncDialFromNum(); onFreqUiChange(); });

    modeSel.addEventListener('change', function () {
        var m = modeSel.value;
        trackRow.style.display = m === 'track' ? '' : 'none';
        if (trackTransportRow) trackTransportRow.style.display = m === 'track' ? '' : 'none';
        presetRow.style.display = m === 'preset' ? '' : 'none';
        if (m !== 'preset') selPreset.selectedIndex = 0;
        restartAudioForMode();
        syncTrackTransportUI();
        if (typeof __cpApplyModeGate === 'function') __cpApplyModeGate();
    });
    (function initModeRows() {
        var m = modeSel.value;
        trackRow.style.display = m === 'track' ? '' : 'none';
        if (trackTransportRow) trackTransportRow.style.display = m === 'track' ? '' : 'none';
        presetRow.style.display = m === 'preset' ? '' : 'none';
    })();
    selPreset.addEventListener('change', function () {
        var p = PRESETS[parseInt(selPreset.value, 10) || 0];
        if (p && p.hz > 0) {
            freqDial.value = Math.round(Math.min(25000, Math.max(1, p.hz)));
            syncFreqFromDial();
        }
        onFreqUiChange();
        if (window.__audioStarted && (modeSel.value === 'preset' || modeSel.value === 'manual')) {
            restartAudioForMode();
        }
    });

    var audioCtx = null;
    var masterOut = null;
    var osc = null;
    var oscGain = null;
    var toneFilter = null;
    var toneEnvGain = null;
    var toneModOsc = null;
    var toneModDepth = null;
    var mediaEl = null;
    var mediaSourceNode = null;
    var analyser = null;
    var fftArray = null;
    var timeDomainData = null;
    var toneAnalyser = null;
    var toneTimeData = null;
    var smoothDomFreq = 220;
    var smoothCentroid = 220;
    var prevFftSum = 0;
    var transientSm = 0;
    var bandSmooth = { sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, treble: 0 };
    var trackObjectUrl = null;

    function formatTrackTime(sec) {
        if (!isFinite(sec) || sec < 0) return '0:00';
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function updateTrackTimeLabel() {
        if (!trackTimeLabel || !mediaEl) return;
        var cur = mediaEl.currentTime || 0;
        var dur = mediaEl.duration;
        trackTimeLabel.textContent = formatTrackTime(cur) + ' / ' + (isFinite(dur) ? formatTrackTime(dur) : '—');
        updateSeekSliderFromMedia();
    }
    function updateSeekSliderFromMedia() {
        if (!trackSeekSlider || !mediaEl || trackSeekDragging) return;
        var d = mediaEl.duration;
        if (!isFinite(d) || d <= 0) return;
        trackSeekSlider.max = d;
        trackSeekSlider.value = mediaEl.currentTime || 0;
    }
    function syncTrackTransportUI() {
        var track = modeSel.value === 'track';
        if (trackTransportRow) trackTransportRow.style.display = track ? '' : 'none';
        var has = !!(mediaEl && mediaEl.src);
        var on = track && has;
        if (btnAudio) {
            if (track) btnAudio.disabled = !has;
            else btnAudio.disabled = false;
        }
        if (btnTrackPause) btnTrackPause.disabled = !on;
        if (trackSeekSlider) {
            if (!has) {
                trackSeekSlider.disabled = true;
                trackSeekSlider.max = 0.001;
                trackSeekSlider.value = 0;
            } else {
                var d = mediaEl.duration;
                var durOk = isFinite(d) && d > 0;
                trackSeekSlider.max = durOk ? d : 0.001;
                trackSeekSlider.disabled = !on || !durOk;
                if (!trackSeekDragging && durOk) {
                    trackSeekSlider.value = mediaEl.currentTime || 0;
                }
            }
        }
        if (trackTimeLabel) {
            if (has) updateTrackTimeLabel();
            else trackTimeLabel.textContent = '— / —';
        }
        syncTransportButtonHighlight();
    }

    function syncTransportButtonHighlight() {
        var a = btnAudio, p = btnTrackPause, st = btnStop;
        [a, p, st].forEach(function (b) {
            if (b) {
                b.classList.remove('transport-btn--active');
                b.setAttribute('aria-pressed', 'false');
            }
        });
        if (!a) return;
        var track = modeSel.value === 'track';
        var has = !!(mediaEl && mediaEl.src);
        var active = null;
        if (track) {
            if (has && mediaEl) {
                if (!mediaEl.paused && !mediaEl.ended) {
                    active = p;
                } else if (mediaEl.ended) {
                    active = a;
                } else if (mediaEl.paused) {
                    if (window.__audioStarted) {
                        active = a;
                    } else {
                        var t0 = mediaEl.currentTime || 0;
                        active = t0 > 0.01 ? st : a;
                    }
                }
            }
        } else {
            if (window.__audioStarted) active = st;
            else active = a;
        }
        if (active) {
            active.classList.add('transport-btn--active');
            active.setAttribute('aria-pressed', 'true');
        }
    }

    function getVolume() {
        return (parseInt(volSlider.value, 10) || 0) / 100;
    }

    function ensureCtx() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            try {
                audioCtx = new AC({ latencyHint: 'interactive' });
            } catch (eCtx) {
                audioCtx = new AC();
            }
            masterOut = audioCtx.createGain();
            masterOut.gain.value = MASTER_HEADROOM_GAIN;
            masterOut.connect(audioCtx.destination);
        }
        return audioCtx;
    }

    function stopOsc() {
        if (toneModOsc) {
            try { toneModOsc.stop(); } catch (eM) {}
            toneModOsc.disconnect();
            toneModOsc = null;
        }
        if (toneModDepth) {
            toneModDepth.disconnect();
            toneModDepth = null;
        }
        if (osc) {
            try { osc.stop(); } catch (e) {}
            osc.disconnect();
            osc = null;
        }
        if (oscGain) {
            oscGain.disconnect();
            oscGain = null;
        }
        if (toneFilter) {
            try { toneFilter.disconnect(); } catch (eF) {}
            toneFilter = null;
        }
        if (toneEnvGain) {
            try { toneEnvGain.disconnect(); } catch (eEv) {}
            toneEnvGain = null;
        }
        if (toneAnalyser) {
            try { toneAnalyser.disconnect(); } catch (e2) {}
            toneAnalyser = null;
        }
        toneTimeData = null;
    }

    function pauseTrackAudioGraph() {
        if (mediaEl) mediaEl.pause();
        if (mediaSourceNode) {
            try { mediaSourceNode.disconnect(); } catch (e) {}
        }
        if (analyser) {
            try { analyser.disconnect(); } catch (e2) {}
        }
    }

    function stopTrack() {
        pauseTrackAudioGraph();
        if (mediaEl) {
            mediaEl.src = '';
            if (trackObjectUrl) {
                URL.revokeObjectURL(trackObjectUrl);
                trackObjectUrl = null;
            }
            mediaEl = null;
        }
        mediaSourceNode = null;
        analyser = null;
        fftArray = null;
        timeDomainData = null;
        prevFftSum = 0;
        transientSm = 0;
        syncTrackTransportUI();
    }

    function killAllAudio() {
        stopOsc();
        stopTrack();
    }

    function ensureTrackAudioGraph() {
        if (!mediaEl || !mediaEl.src) return;
        ensureCtx();
        if (!mediaSourceNode) {
            mediaSourceNode = audioCtx.createMediaElementSource(mediaEl);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 8192;
            analyser.smoothingTimeConstant = 0.38;
            fftArray = new Uint8Array(analyser.frequencyBinCount);
            timeDomainData = new Uint8Array(analyser.fftSize);
        }
        try { mediaSourceNode.disconnect(); } catch (eD) {}
        try { analyser.disconnect(); } catch (eA) {}
        mediaSourceNode.connect(analyser);
        ensureCtx();
        analyser.connect(masterOut);
        mediaEl.volume = Math.min(1, getVolume());
    }

    /** Low-pass only for gentle anti-alias; cutoff always above the sine fundamental. */
    function toneAntiAliasLowpassHz(carrierHz, sampleRate) {
        carrierHz = Math.max(1, Math.min(20000, carrierHz));
        var nyq = sampleRate > 0 ? sampleRate * 0.48 : 22050;
        var wide = carrierHz * 2.2 + 3200;
        return Math.min(nyq, Math.max(9000, wide));
    }

    function startOscillatorAtHz(hz) {
        ensureCtx();
        stopOsc();
        pauseTrackAudioGraph();
        var heal = getPresetHealingHz();
        var useHealPulse = heal >= 3 && heal < 52;

        osc = audioCtx.createOscillator();
        osc.type = 'sine';
        var c = Math.max(1, Math.min(20000, hz));
        osc.frequency.setValueAtTime(c, audioCtx.currentTime);

        oscGain = audioCtx.createGain();
        toneFilter = audioCtx.createBiquadFilter();
        toneFilter.type = 'lowpass';
        toneFilter.frequency.value = toneAntiAliasLowpassHz(c, audioCtx.sampleRate);
        toneFilter.Q.value = 0.55;

        var base = getVolume() * TONE_BRANCH_TRIM * lowFreqGainMul(c);

        toneAnalyser = audioCtx.createAnalyser();
        toneAnalyser.fftSize = 2048;
        toneAnalyser.smoothingTimeConstant = 0.45;
        toneTimeData = new Uint8Array(toneAnalyser.fftSize);

        toneEnvGain = audioCtx.createGain();
        toneEnvGain.gain.setValueAtTime(0, audioCtx.currentTime);

        if (useHealPulse) {
            oscGain.gain.value = base * 0.78;
            toneModOsc = audioCtx.createOscillator();
            toneModOsc.type = 'sine';
            toneModOsc.frequency.value = heal;
            toneModDepth = audioCtx.createGain();
            toneModDepth.gain.value = base * 0.24;
            toneModOsc.connect(toneModDepth);
            toneModDepth.connect(oscGain.gain);
            toneModOsc.start(0);
        } else {
            oscGain.gain.value = base;
        }

        osc.connect(oscGain).connect(toneFilter).connect(toneEnvGain).connect(toneAnalyser).connect(masterOut);
        var t0 = audioCtx.currentTime;
        toneEnvGain.gain.linearRampToValueAtTime(1, t0 + 0.022);
        osc.start(0);
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function readToneAnalyserRms() {
        if (!toneAnalyser || !toneTimeData) return 0;
        toneAnalyser.getByteTimeDomainData(toneTimeData);
        var s = 0;
        for (var i = 0; i < toneTimeData.length; i++) {
            var x = (toneTimeData[i] - 128) / 128;
            s += x * x;
        }
        return Math.sqrt(s / toneTimeData.length);
    }

    function restartAudioForMode() {
        var v = getToneHzForAudio();
        var m = modeSel.value;
        if (m === 'manual' || m === 'preset') {
            pauseTrackAudioGraph();
            stopOsc();
            if (window.__audioStarted) {
                startOscillatorAtHz(v);
            }
        } else if (m === 'track') {
            stopOsc();
            runAfterContextReady(ensureCtx(), function () {
                ensureTrackAudioGraph();
                if (window.__audioStarted && mediaEl) {
                    var playTry = mediaEl.play();
                    if (playTry && typeof playTry.catch === 'function') {
                        playTry.catch(function () {
                            readout.textContent = 'Playback blocked—click Play again.';
                            window.__audioStarted = false;
                        });
                    }
                }
            });
        }
    }

    function onFreqUiChange() {
        var hzAudio = getToneHzForAudio();
        var heal = getPresetHealingHz();
        if (audioCtx && osc && (modeSel.value === 'manual' || modeSel.value === 'preset')) {
            var c = Math.max(1, Math.min(20000, hzAudio));
            osc.frequency.value = c;
            if (toneModOsc && heal >= 3 && heal < 52) {
                toneModOsc.frequency.value = heal;
            }
            if (toneFilter && audioCtx) {
                toneFilter.frequency.setTargetAtTime(
                    toneAntiAliasLowpassHz(c, audioCtx.sampleRate),
                    audioCtx.currentTime,
                    0.02
                );
            }
            if (oscGain) {
                var base = getVolume() * TONE_BRANCH_TRIM * lowFreqGainMul(c);
                if (toneModDepth && toneModOsc && heal >= 3 && heal < 52) {
                    oscGain.gain.value = base * 0.78;
                    toneModDepth.gain.value = base * 0.24;
                } else {
                    oscGain.gain.value = base;
                }
            }
        }
    }

    volSlider.addEventListener('input', function () {
        var g = getVolume();
        if (oscGain) {
            var th = getToneHzForAudio();
            var c = Math.max(1, Math.min(20000, th));
            var heal = getPresetHealingHz();
            var base = g * TONE_BRANCH_TRIM * lowFreqGainMul(c);
            if (toneModDepth && toneModOsc && heal >= 3 && heal < 52) {
                oscGain.gain.value = base * 0.78;
                toneModDepth.gain.value = base * 0.24;
            } else {
                oscGain.gain.value = base;
            }
        }
        if (mediaEl) mediaEl.volume = Math.min(1, g);
    });

    function runAfterContextReady(ctx, fn) {
        if (!ctx) return;
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
            try {
                var p = ctx.resume();
                if (p && typeof p.then === 'function') {
                    p.then(fn).catch(fn);
                    return;
                }
            } catch (eR) {}
        }
        fn();
    }

    function cymaticsResumeWebAudio() {
        ensureCtx();
        if (modeSel && modeSel.value === 'track' && mediaEl && mediaEl.src) {
            ensureTrackAudioGraph();
        }
        if (audioCtx && typeof audioCtx.resume === 'function') {
            return audioCtx.resume();
        }
        return typeof Promise !== 'undefined' ? Promise.resolve() : undefined;
    }
    if (typeof window !== 'undefined') {
        window.__cymaticsResumeWebAudio = cymaticsResumeWebAudio;
    }
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        cymaticsResumeWebAudio();
    });

    btnAudio.addEventListener('click', function () {
        var ctx = ensureCtx();
        runAfterContextReady(ctx, function () {
            window.__audioStarted = true;
            var hz = getToneHzForAudio();
            if (modeSel.value === 'manual' || modeSel.value === 'preset') {
                startOscillatorAtHz(hz);
            } else if (modeSel.value === 'track') {
                if (!mediaEl || !mediaEl.src) {
                    readout.textContent = 'Choose an audio file first.';
                    window.__audioStarted = false;
                    return;
                }
                ensureTrackAudioGraph();
                var playTry = mediaEl.play();
                if (playTry && typeof playTry.catch === 'function') {
                    playTry.catch(function () {
                        readout.textContent = 'Playback blocked—click Play again.';
                        window.__audioStarted = false;
                        syncTrackTransportUI();
                    });
                }
                syncTrackTransportUI();
            }
        });
    });

    btnStop.addEventListener('click', function () {
        if (modeSel.value === 'track' && mediaEl && mediaEl.src) {
            mediaEl.pause();
            stopOsc();
            window.__audioStarted = false;
            syncTrackTransportUI();
            return;
        }
        killAllAudio();
        window.__audioStarted = false;
        syncTrackTransportUI();
    });

    if (trackSeekSlider) {
        trackSeekSlider.addEventListener('input', function () {
            if (!mediaEl || !mediaEl.src) return;
            var t = parseFloat(trackSeekSlider.value);
            if (isFinite(t) && t >= 0) {
                mediaEl.currentTime = t;
                updateTrackTimeLabel();
            }
        });
        trackSeekSlider.addEventListener('mousedown', function () {
            trackSeekDragging = true;
        });
        trackSeekSlider.addEventListener('touchstart', function () {
            trackSeekDragging = true;
        }, { passive: true });
    }
    window.addEventListener('mouseup', function () {
        if (trackSeekDragging) {
            trackSeekDragging = false;
            updateSeekSliderFromMedia();
        }
    });
    window.addEventListener('touchend', function () {
        if (trackSeekDragging) {
            trackSeekDragging = false;
            updateSeekSliderFromMedia();
        }
    });
    if (btnTrackPause) btnTrackPause.addEventListener('click', function () {
        if (!mediaEl || !mediaEl.src) return;
        mediaEl.pause();
        syncTrackTransportUI();
    });

    fileIn.addEventListener('change', function () {
        var f = fileIn.files && fileIn.files[0];
        killAllAudio();
        window.__audioStarted = false;
        if (!f) return;
        ensureCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        trackObjectUrl = URL.createObjectURL(f);
        mediaEl = new Audio();
        try {
            mediaEl.setAttribute('playsinline', '');
        } catch (ePl) { /* no-op */ }
        if (mediaEl.playsInline !== undefined) {
            mediaEl.playsInline = true;
        }
        mediaEl.preload = 'auto';
        mediaEl.src = trackObjectUrl;
        mediaEl.volume = getVolume();
        ensureTrackAudioGraph();
        smoothDomFreq = hzFromDial();
        mediaEl.addEventListener('timeupdate', updateTrackTimeLabel);
        mediaEl.addEventListener('loadedmetadata', function () { updateTrackTimeLabel(); syncTrackTransportUI(); });
        mediaEl.addEventListener('play', syncTrackTransportUI);
        mediaEl.addEventListener('pause', syncTrackTransportUI);
        mediaEl.addEventListener('ended', function () { window.__audioStarted = false; syncTrackTransportUI(); });
        syncTrackTransportUI();
    });

    function hzFromDial() {
        return Math.max(1, Math.min(25000, parseInt(freqDial.value, 10) || 528));
    }

    function hzFromBin(peakI, peak) {
        var nyquist = audioCtx.sampleRate * 0.5;
        var raw = peakI * nyquist / fftArray.length;
        if (peakI > 0 && peakI < fftArray.length - 1 && peak > 8) {
            var y0 = fftArray[peakI - 1], y1 = fftArray[peakI], y2 = fftArray[peakI + 1];
            var denom = y0 - 2 * y1 + y2;
            if (Math.abs(denom) > 0.001) {
                var delta = 0.5 * (y0 - y2) / denom;
                raw = (peakI + delta) * nyquist / fftArray.length;
            }
        }
        return Math.max(1, Math.min(25000, raw));
    }

    /** Rich FFT snapshot: centroid, peaks, per-band drive, transients, RMS */
    function analyzeTrackAudio() {
        if (!analyser || !fftArray) return null;
        analyser.getByteFrequencyData(fftArray);
        var n = fftArray.length;
        var nyq = audioCtx.sampleRate * 0.5;
        var peak = 0;
        var peakI = 2;
        var centroidNum = 0;
        var centroidDen = 0;
        var sum = 0;
        var sub = 0, bass = 0, lowMid = 0, mid = 0, high = 0, treble = 0;
        var cSub = 0, cBass = 0, cLm = 0, cMid = 0, cHi = 0, cTr = 0;
        var i = 0;
        var hz;
        for (i = 2; i < n; i++) {
            var v = fftArray[i];
            sum += v;
            hz = (i * nyq) / n;
            centroidNum += hz * v;
            centroidDen += v;
            if (v > peak) {
                peak = v;
                peakI = i;
            }
            if (hz < 90) {
                sub += v;
                cSub++;
            } else if (hz < 280) {
                bass += v;
                cBass++;
            } else if (hz < 900) {
                lowMid += v;
                cLm++;
            } else if (hz < 2800) {
                mid += v;
                cMid++;
            } else if (hz < 9000) {
                high += v;
                cHi++;
            } else {
                treble += v;
                cTr++;
            }
        }
        var avg = function (s, c) {
            return c > 0 ? (s / c) / 255 : 0;
        };
        var bSub = avg(sub, cSub);
        var bBass = avg(bass, cBass);
        var bLm = avg(lowMid, cLm);
        var bMid = avg(mid, cMid);
        var bHi = avg(high, cHi);
        var bTr = avg(treble, cTr);

        var peakHz = hzFromBin(peakI, peak);
        var centroid = centroidDen > 0.5 ? centroidNum / centroidDen : peakHz;
        centroid = Math.max(1, Math.min(25000, centroid));

        var alpha = Math.max(0.06, Math.min(0.62, (0.58 - simControls.fftSmoothing * 0.95) * simControls.trackHzSpeed));
        smoothDomFreq += (peakHz - smoothDomFreq) * alpha;
        smoothCentroid += (centroid - smoothCentroid) * alpha;

        var blendC = Math.max(0, Math.min(1, simControls.centroidBlend));
        var combinedHz = smoothCentroid * blendC + smoothDomFreq * (1 - blendC);

        var flux = Math.max(0, sum - prevFftSum);
        prevFftSum = prevFftSum * simControls.fluxDecay + sum * (1 - simControls.fluxDecay);
        transientSm = transientSm * 0.76 + Math.min(1, flux / Math.max(18, simControls.transientGain * n * 0.035)) * 0.24;

        var rms = 0;
        if (timeDomainData) {
            analyser.getByteTimeDomainData(timeDomainData);
            for (i = 0; i < timeDomainData.length; i++) {
                var x = (timeDomainData[i] - 128) / 128;
                rms += x * x;
            }
            rms = Math.sqrt(rms / timeDomainData.length);
        }

        var bAlpha = Math.min(0.52, 0.12 + simControls.bandSnap * 0.34);
        bandSmooth.sub   += (bSub   - bandSmooth.sub)   * bAlpha;
        bandSmooth.bass   += (bBass  - bandSmooth.bass)  * bAlpha;
        bandSmooth.lowMid += (bLm    - bandSmooth.lowMid) * bAlpha;
        bandSmooth.mid    += (bMid   - bandSmooth.mid)   * bAlpha;
        bandSmooth.high   += (bHi    - bandSmooth.high)  * bAlpha;
        bandSmooth.treble += (bTr    - bandSmooth.treble)* bAlpha;

        var level = Math.min(1.85,
            rms * 4.2 * simControls.rmsWeight +
            (sum / (n * 38)) * simControls.spectralLevelWeight +
            transientSm * simControls.beatPunch * 0.45
        );

        var fluxNormDen = Math.max(22, simControls.transientGain * n * 0.035);
        var fluxNorm = Math.min(1, flux / fluxNormDen);

        return {
            hz: combinedHz,
            peakHz: smoothDomFreq,
            centroid: smoothCentroid,
            level: level,
            transient: transientSm,
            rms: rms,
            bands: bandSmooth,
            fluxNorm: fluxNorm
        };
    }

    function driveFrequencyAndLevel(time) {
        var mode = modeSel.value;
        var emptyBands = { sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, treble: 0 };
        var hz;
        var level = 0.35 + 0.25 * Math.sin(time * 0.7);
        var snap = {
            hz: hzFromDial(),
            peakHz: hzFromDial(),
            centroid: hzFromDial(),
            level: level,
            transient: 0,
            rms: 0,
            bands: emptyBands,
            fluxNorm: 0
        };

        if (mode === 'track' && analyser && mediaEl && fftArray && !mediaEl.paused) {
            var a = analyzeTrackAudio();
            if (a) snap = a;
            hz = snap.hz;
            level = snap.level;
        } else if (mode === 'track') {
            hz = hzFromDial();
            level = 0.22 + 0.12 * Math.sin(time * 0.6);
            snap.hz = hz;
            snap.level = level;
        } else if (mode === 'preset') {
            var pi = parseInt(selPreset.value, 10) || 0;
            hz = PRESETS[pi].hz > 0 ? PRESETS[pi].hz : hzFromDial();
            level = Math.min(1, getVolume() * 1.4);
            snap.hz = hz;
            snap.level = level;
            snap.rms = readToneAnalyserRms();
        } else {
            hz = hzFromDial();
            level = Math.min(1, getVolume() * 1.4);
            snap.hz = hz;
            snap.level = level;
            snap.rms = readToneAnalyserRms();
        }
        var bias = Math.max(0, Math.min(1, simControls.trackBlend));
        if (mode === 'track') {
            hz = hz * (1 - bias) + hzFromDial() * bias;
            snap.hz = hz;
        }
        hz = Math.max(1, Math.min(25000, hz));
        level = Math.max(0.08, Math.min(2.2, level * simControls.motionGain));
        snap.level = level;
        if (audioCtx && window.__audioStarted) {
            var tNow = audioCtx.currentTime;
            var rmsSpin = snap.rms != null ? snap.rms : 0;
            var trSpin = snap.transient != null ? snap.transient : 0;
            var rate = 0.12 + rmsSpin * 3.5 + trSpin * 1.2 + (mode === 'track' ? 0.05 : 0);
            snap.colorSpin = tNow * rate + hzToPalette01(hz) * 0.517;
            snap.colorSpin -= Math.floor(snap.colorSpin);
        } else {
            snap.colorSpin = 0;
        }
        return { hz: hz, level: level, snap: snap };
    }

    function hexToRgb01(hex) {
        if (!hex || typeof hex !== 'string') return { r: 0.1, g: 0.2, b: 0.5 };
        var s = hex.replace('#', '');
        if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
        return {
            r: parseInt(s.slice(0, 2), 16) / 255,
            g: parseInt(s.slice(2, 4), 16) / 255,
            b: parseInt(s.slice(4, 6), 16) / 255
        };
    }

    function lerp3(a, b, t) {
        return a + (b - a) * t;
    }

    /** 0..1 from ~20 Hz .. ~20 kHz (log): drives position along the low→mid→high palette */
    function hzToPalette01(hz) {
        hz = Math.max(20, Math.min(22000, hz));
        var lo = Math.log(20);
        var hi = Math.log(22000);
        return (Math.log(hz) - lo) / (hi - lo);
    }

    function fract(x) {
        return x - Math.floor(x);
    }

    function hsvToRgb(h, s, v) {
        h = fract(h);
        s = Math.max(0, Math.min(1, s));
        v = Math.max(0, Math.min(1, v));
        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: return { r: v, g: t, b: p };
            case 1: return { r: q, g: v, b: p };
            case 2: return { r: p, g: v, b: t };
            case 3: return { r: p, g: q, b: v };
            case 4: return { r: t, g: p, b: v };
            default: return { r: v, g: p, b: q };
        }
    }

    /** Three distinct hues (trough / mid / crest) that sweep the spectrum with audio + time spin. */
    function buildAudioPaletteStops(snap, transient) {
        var hz = snap.hz != null ? snap.hz : hzFromDial();
        var B = snap.bands || {};
        var rms = snap.rms != null ? snap.rms : 0;
        var lvl = snap.level != null ? snap.level : 0.5;
        var pitchHue = hzToPalette01(hz);
        var bandWalk = (B.bass || 0) * 0.2 - (B.treble || 0) * 0.17 + (B.mid || 0) * 0.11;
        var dyn = transient * 0.24 + Math.min(1, rms * 3) * 0.2 + Math.min(1, lvl * 0.25) * 0.1;
        var spin = snap.colorSpin != null ? snap.colorSpin : 0;
        var spread = Math.max(0.24, Math.min(0.52, 0.26 + simControls.audioHueSpread * 0.17));
        var hueCenter = fract(pitchHue * 0.85 + bandWalk + dyn + spin * 0.72);
        var hTrough = fract(hueCenter - spread * 0.85);
        var hMid = fract(hueCenter);
        var hCrest = fract(hueCenter + spread * 1.05);
        var en = Math.min(1, 0.15 + rms * 2.9 + transient * 0.5 + Math.min(1, lvl * 0.3));
        var sb = Math.max(0, Math.min(1.5, simControls.audioSatBoost));
        var bb = Math.max(0, Math.min(1.5, simControls.audioBrightBoost));
        var sT = Math.min(1, 0.82 + 0.18 * en * sb);
        var sM = Math.min(1, 0.86 + 0.14 * en * sb);
        var sC = Math.min(1, 0.88 + 0.12 * en * sb);
        var vT = Math.min(1, 0.26 + 0.28 * en + 0.14 * bb);
        var vM = Math.min(1, 0.42 + 0.3 * en + 0.16 * bb);
        var vC = Math.min(1, 0.58 + 0.34 * en + 0.2 * bb);
        return {
            c0: hsvToRgb(hTrough, sT, vT),
            c1: hsvToRgb(hMid, sM, vM),
            c2: hsvToRgb(hCrest, sC, vC)
        };
    }

    function sampleGradient(n, split1, c0, c1, c2) {
        n = Math.max(0, Math.min(1, n));
        if (n < split1) {
            var tt = n / split1;
            return {
                r: lerp3(c0.r, c1.r, tt),
                g: lerp3(c0.g, c1.g, tt),
                b: lerp3(c0.b, c1.b, tt)
            };
        }
        tt = (n - split1) / (1 - split1);
        return {
            r: lerp3(c1.r, c2.r, tt),
            g: lerp3(c1.g, c2.g, tt),
            b: lerp3(c1.b, c2.b, tt)
        };
    }

    /**
     * heightToColor: manual = shadow/mid/crest from pickers. Audio-reactive ON + Start audio =
     * same three *roles* (trough / rim / crest) as three separated hues that move with sound;
     * blend to manual via audio ↔ height blend.
     */
    function heightToColor(h, transient, arr, ix, snap) {
        snap = snap || {};
        var nBase = (h + 1) * 0.5;
        nBase = Math.max(0, Math.min(1, nBase + transient * simControls.colorBeatBoost * 0.22));
        var c0m = hexToRgb01(palette.colorLow);
        var c1m = hexToRgb01(palette.colorMid);
        var c2m = hexToRgb01(palette.colorHigh);
        var split1 = Math.max(0.12, Math.min(0.55, simControls.colorMidpoint));
        var colManual = sampleGradient(nBase, split1, c0m, c1m, c2m);
        var r = colManual.r;
        var g = colManual.g;
        var b = colManual.b;

        var amt = simControls.audioColorAmount;
        var audioOn = !!window.__audioStarted;
        if (simControls.audioReactiveColors && audioOn && amt > 0.004) {
            var stops = buildAudioPaletteStops(snap, transient);
            var colAudio = sampleGradient(nBase, split1, stops.c0, stops.c1, stops.c2);
            var k = Math.max(0, Math.min(1, amt));
            r = colManual.r * (1 - k) + colAudio.r * k;
            g = colManual.g * (1 - k) + colAudio.g * k;
            b = colManual.b * (1 - k) + colAudio.b * k;
        }

        var vib = simControls.colorVibrance;
        var lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = r * vib + lum * (1 - vib);
        g = g * vib + lum * (1 - vib);
        b = b * vib + lum * (1 - vib);
        arr[ix] = Math.min(1, Math.max(0, r));
        arr[ix + 1] = Math.min(1, Math.max(0, g));
        arr[ix + 2] = Math.min(1, Math.max(0, b));
    }

    /** Standing-wave on disk; audio drives extra modes, transients, band ripples */
    function waveHeight(r, theta, timeSec, freqHz, ampNorm, audio) {
        audio = audio || {};
        var B = audio.bands || {};
        var tr = audio.transient || 0;
        var bm = simControls.bandMotion * (1 + tr);

        var m = Math.max(2, Math.min(42, Math.round(Math.sqrt(freqHz / 20) + B.bass * 5 * bm + B.mid * 3 * bm)));
        var k = 3 + Math.floor(freqHz / 360) + Math.floor(B.lowMid * 4 * bm + B.high * 5 * bm);

        var warp = (1 + tr * simControls.beatPunch * 0.55 + B.sub * simControls.subWeight) * simControls.timeWarp;
        var w = freqHz * 0.0000195 * warp;

        /* Particles use r up to ~1.12; old vignette hit 0 by r≥1.05 so the rim was frozen. */
        var edgeT = Math.min(1, Math.max(0, (1.2 - r) / 0.62));
        edgeT = edgeT * edgeT * (3 - 2 * edgeT);
        var edge = simControls.edgeRimMin + (1 - simControls.edgeRimMin) * edgeT;

        var amp = ampNorm * simControls.heightAmp * (1 + tr * simControls.beatPunch * 0.65 + B.bass * 0.35);
        var h = 0;

        h += Math.cos(m * theta + timeSec * w) * Math.cos(k * r * Math.PI * 2.2 + timeSec * w * 0.85);

        var iF = simControls.interference * (1 + B.mid * 0.9 + tr * 0.4);
        h += iF * Math.cos((m + 2) * theta - timeSec * w * 1.08) * Math.cos((k + 2) * r * Math.PI * 2 + timeSec * w * 0.58);

        var fr = simControls.fineRipple * (1 + B.treble * 1.2 + B.high * 0.6);
        h += fr * Math.cos(m * 2 * theta + r * (14 + B.high * 10)) * Math.sin((9 + B.treble * 6) * r * Math.PI * 2 + timeSec * w * 1.25);

        var sideM = Math.max(2, m - 1 + Math.floor(B.lowMid * 4));
        h += B.mid * bm * 0.62 * Math.sin(sideM * theta * 2 + timeSec * w * 1.4) * Math.cos(4 * r * Math.PI + timeSec * w);

        h += tr * simControls.transientRipple * Math.cos(12 * theta + timeSec * 18) * Math.sin(7 * r * Math.PI - timeSec * 12);

        return h * amp * edge;
    }

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG, 0.045);

    var camera = new THREE.PerspectiveCamera(48, 1, 0.02, 80);
    camera.position.set(0, 0.08, 2.5);
    var __cpLookTarget = new THREE.Vector3(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(BG, 1);
    var container = document.getElementById('portal-container');
    container.insertBefore(renderer.domElement, container.firstChild);
    renderer.domElement.style.borderRadius = 'var(--radius)';

    (function () {
        var canvas = renderer.domElement;
        canvas.addEventListener('webglcontextlost', function (e) {
            e.preventDefault();
        }, false);
        canvas.addEventListener('webglcontextrestored', function () {
            try {
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                try {
                    __cpLastSizeW = 0;
                    __cpLastSizeH = 0;
                } catch (eRs) {}
                resize();
            } catch (err) {}
        }, false);
    })();

    var zoom = 0;
    window.addEventListener('wheel', function (e) {
        zoom += e.deltaY * 0.00045;
        zoom = Math.max(-0.7, Math.min(1.1, zoom));
    }, { passive: true });

    var __cpResizeRaf = null;
    var __cpLastSizeW = 0, __cpLastSizeH = 0;
    function resize() {
        var rect = container.getBoundingClientRect();
        var w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
        if (w === __cpLastSizeW && h === __cpLastSizeH) return;
        __cpLastSizeW = w;
        __cpLastSizeH = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, true);
    }
    function scheduleResize() {
        if (__cpResizeRaf != null) return;
        __cpResizeRaf = requestAnimationFrame(function () {
            __cpResizeRaf = null;
            resize();
        });
    }
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', function () {
        setTimeout(function () {
            __cpLastSizeW = 0;
            __cpLastSizeH = 0;
            resize();
        }, 200);
    });
    setTimeout(resize, 50);
    setTimeout(resize, 300);
    if (typeof ResizeObserver !== 'undefined') {
        var ro = new ResizeObserver(scheduleResize);
        ro.observe(container);
    }

    var geom = null;
    var baseXY = null;
    var polarR = null;
    var polarTh = null;
    var colAttr = null;
    var pointsMat = null;
    var pointsClassicMat = null;
    var splatFullMesh = null;
    var splatFullInstPos = null;
    var splatFullInstCol = null;
    var visualMode = 'points';
    var fractalBackdropMesh = null;
    var fractalBackdropMat = null;
    var fractalBackdropRig = null;
    var fractalSmViewInit = false;
    var fractalMbTourSeg = -1;
    var fractalMbJourney = 0;
    var fractalMbJourneyRateSm = 1;
    var fractalMbViewWobbleSm = 0;
    var fractalMbInteriorPh0 = 0;
    var fractalMbInteriorPh1 = 0;
    var fractalMbInteriorPh2 = 0;
    var fractalMbInteriorSpinAccum = 0;
    var fractalMbInteriorSpinRateSm = 0.12;
    var fractalMbArmDriveSlow = 0;
    var fractalMbArmDriveFast = 0;
    var fractalJuliaTourSeg = -1;
    var fractalJuliaFlow = 0;
    var fractalJuliaLegIndex = 0;
    var fractalSmViewPos = new THREE.Vector3();
    var fractalSmViewQuat = new THREE.Quaternion();
    var fractalSmAudioLvl = 0;
    var fractalSmAudioBT = 0;
    var fractalSmZoom = 1.2;
    var fractalSmCx = -0.743643887037151;
    var fractalSmCy = 0.131825904037152;
    var fractalSmMaxIter = 220;
    var fractalSmPal = 0;
    var fractalSmColorI = 0.55;
    var fractalSmJcr = -0.7269;
    var fractalSmJci = 0.1889;
    var fractalSmJZoom = 1.2;
    var fractalSmJPx = 0;
    var fractalSmJPy = 0;
    var fractalSmJMaxIter = 200;
    var fractalJuliaSpiralAccum = 0;
    var fractalSmJSpiralAudio = 0;
    var fractalJuliaFastLvl = 0;
    var fractalJuliaBandDriftCr = 0;
    var fractalJuliaBandDriftCi = 0;
    var fractalJuliaRmsDrift = 0;
    var fractalJuliaOrbitPh = 0;
    var fractalJuliaOrbitPh2 = 0;
    var fractalJuliaConnectEnergy = 0;
    var fractalJuliaConnectSm = 0;
    var fractalJuliaSmTr = 0;
    var fractalJuliaDiscEffSm = 0.135;

    function fractalExpSmooth(cur, target, dt, tau) {
        if (!(tau > 0) || !isFinite(dt) || dt <= 0) return target;
        var a = 1 - Math.exp(-dt / tau);
        return cur + (target - cur) * a;
    }

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

    /** Fractal backdrop — ported from Nāda Brahma fractal-shaders.ts (WebGL2) to Three ShaderMaterial. */
    function makeFractalBackdropMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                u_resolution: { value: new THREE.Vector2(1024, 768) },
                u_center: { value: new THREE.Vector2(-0.743643887037151, 0.131825904037152) },
                u_zoom: { value: 2.0 },
                u_maxIter: { value: 200 },
                u_c: { value: new THREE.Vector2(-0.7269, 0.1889) },
                u_paletteOffset: { value: 0 },
                u_escapeRadius: { value: 2 },
                u_isJulia: { value: 0 },
                u_colorIntensity: { value: 0.55 },
                u_viewAngle: { value: 0 },
                u_spiralPhase: { value: 0 },
                u_mbInteriorPhase: { value: new THREE.Vector3(0, 0, 0) },
                u_mbInteriorSpin: { value: 0 },
                u_mbArmDrive: { value: 0 }
            },
            fog: false,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            vertexShader: [
                'varying vec2 vUv;',
                'void main() {',
                '  vUv = uv;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'precision highp float;',
                'varying vec2 vUv;',
                'uniform vec2 u_resolution;',
                'uniform vec2 u_center;',
                'uniform float u_zoom;',
                'uniform float u_maxIter;',
                'uniform vec2 u_c;',
                'uniform float u_paletteOffset;',
                'uniform float u_escapeRadius;',
                'uniform float u_isJulia;',
                'uniform float u_colorIntensity;',
                'uniform float u_viewAngle;',
                'uniform float u_spiralPhase;',
                'uniform vec3 u_mbInteriorPhase;',
                'uniform float u_mbInteriorSpin;',
                'uniform float u_mbArmDrive;',
                'vec3 palette(float t) {',
                '  float hue = t * 3.0 + u_paletteOffset;',
                '  float r = 0.5 + 0.5 * cos(6.28318 * hue);',
                '  float g = 0.5 + 0.5 * cos(6.28318 * (hue + 0.33));',
                '  float b = 0.5 + 0.5 * cos(6.28318 * (hue + 0.67));',
                '  vec3 base = vec3(r, g, b);',
                '  float sat = 0.5 + u_colorIntensity * 0.5;',
                '  return mix(vec3(0.5), base, sat);',
                '}',
                'float juliaAngleCont(float zx, float zy) {',
                '  float rh = length(vec2(zx, zy));',
                '  if (rh < 1e-7) return 0.0;',
                '  return 2.0 * atan(zy, zx + rh + 1e-7);',
                '}',
                'void main() {',
                '  vec2 v_coord = vec2(vUv.x * 2.0 - 1.0, vUv.y * 2.0 - 1.0);',
                '  float scale = pow(2.0, u_zoom);',
                '  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);',
                '  vec2 p = (v_coord * aspect) / scale;',
                '  float cr = cos(u_viewAngle);',
                '  float sr = sin(u_viewAngle);',
                '  vec2 pr = vec2(p.x * cr + p.y * sr, -p.x * sr + p.y * cr);',
                '  vec2 complexCoord = pr + u_center;',
                '  vec2 z;',
                '  vec2 c;',
                '  if (u_isJulia < 0.5) {',
                '    z = vec2(0.0, 0.0);',
                '    c = complexCoord;',
                '  } else {',
                '    z = complexCoord;',
                '    c = u_c;',
                '  }',
                '  float n = -1.0;',
                '  for (int i = 0; i < 640; i++) {',
                '    if (float(i) >= u_maxIter) break;',
                '    float x2 = z.x * z.x;',
                '    float y2 = z.y * z.y;',
                '    if (x2 + y2 > u_escapeRadius * u_escapeRadius) {',
                '      float log_zn = log(x2 + y2) * 0.5;',
                '      float nu = log(log_zn / log(2.0)) / log(2.0);',
                '      n = float(i) + 1.0 - nu;',
                '      break;',
                '    }',
                '    z = vec2(x2 - y2 + c.x, 2.0 * z.x * z.y + c.y);',
                '  }',
                '  float denom = max(u_maxIter, 1.0);',
                '  vec3 outRgb;',
                '  if (u_isJulia > 0.5) {',
                '    if (n >= 0.0) {',
                '      float tLin = clamp(n / denom, 0.0, 1.0);',
                '      float zx0 = complexCoord.x;',
                '      float zy0 = complexCoord.y;',
                '      float r0 = length(vec2(zx0, zy0));',
                '      float a0 = juliaAngleCont(zx0, zy0);',
                '      float lr0 = log(r0 + 1e-6);',
                '      float spr0 = lr0 * 0.48 + u_spiralPhase * 0.26 + u_paletteOffset * 0.07;',
                '      spr0 += 0.036 * sin(2.0 * a0 + lr0 * 1.15 + u_spiralPhase * 0.85);',
                '      spr0 += 0.024 * sin(4.0 * a0 + u_paletteOffset * 2.1 + lr0 * 0.65);',
                '      float zr2 = z.x * z.x + z.y * z.y;',
                '      float zang = juliaAngleCont(z.x, z.y);',
                '      float zlr = log(zr2) * 0.5;',
                '      float sprEsc = zlr * 0.13;',
                '      sprEsc += 0.030 * sin(2.0 * zang + zlr * 0.9 + u_spiralPhase * 0.5);',
                '      sprEsc += 0.020 * cos(4.0 * zang + zlr * 0.45 + u_paletteOffset * 1.3);',
                '      float sprSum = spr0 + sprEsc + tLin * 0.1;',
                '      float spiralAcc = fract(sprSum);',
                '      float t = clamp(0.3 * tLin + 0.7 * spiralAcc, 0.0, 0.98);',
                '      outRgb = palette(t);',
                '      float nearEdge = (1.0 - tLin) * (1.0 - tLin);',
                '      outRgb *= 1.0 + 0.22 * nearEdge;',
                '      outRgb = mix(outRgb, outRgb * 1.07, tLin * 0.2);',
                '    } else {',
                '      float ang = juliaAngleCont(z.x, z.y);',
                '      float rm = length(z);',
                '      float lf = log(max(rm, 5e-7));',
                '      float zx0 = complexCoord.x;',
                '      float zy0 = complexCoord.y;',
                '      float sub = 0.5 + 0.5 * sin(ang * 1.55 + lf * 1.25 + u_paletteOffset * 0.22);',
                '      vec3 deep = vec3(0.018, 0.026, 0.072);',
                '      vec3 lift = vec3(0.065, 0.056, 0.15);',
                '      outRgb = mix(deep, lift, sub);',
                '      float grain = 0.5 + 0.5 * sin(zx0 * 9.0 + zy0 * 7.5 + lf * 2.8);',
                '      outRgb += vec3(0.015, 0.02, 0.038) * grain;',
                '      float rI = length(vec2(zx0, zy0));',
                '      float aI = juliaAngleCont(zx0, zy0);',
                '      float lrI = log(rI + 1e-6);',
                '      float spIFull = lrI * 0.5 + u_spiralPhase * 0.25 + lf * 0.055;',
                '      spIFull += 0.038 * sin(2.0 * aI + lrI * 1.05 + u_spiralPhase * 0.7);',
                '      spIFull += 0.026 * sin(4.0 * ang + lf * 0.9 + u_paletteOffset * 1.4);',
                '      float sprI = fract(spIFull);',
                '      vec3 sArm = palette(0.1 + sprI * 0.62);',
                '      sArm *= vec3(0.26, 0.28, 0.4);',
                '      outRgb = mix(outRgb, sArm, 0.44 * (0.55 + 0.45 * sub));',
                '      outRgb = clamp(outRgb, 0.0, 1.0);',
                '    }',
                '  } else {',
                '    float t;',
                '    if (n >= 0.0) {',
                '      float t0 = n / denom;',
                '      float tend = smoothstep(0.16, 0.96, t0);',
                '      float cx = complexCoord.x;',
                '      float cy = complexCoord.y;',
                '      float armA = sin(n * 1.05 + u_mbInteriorSpin * 2.25 + cx * 54.0 + cy * 48.0);',
                '      float armB = sin(n * 1.52 - u_mbInteriorSpin * 1.55 + cx * 76.0 - cy * 41.0);',
                '      float armC = cos(n * 0.88 + u_mbInteriorSpin * 1.9 + (cx - cy) * 63.0);',
                '      float wob = u_mbArmDrive * tend;',
                '      t = t0 + wob * (0.085 * armA + 0.048 * armB + 0.032 * armC);',
                '      t = clamp(t, 0.0, 0.999);',
                '      outRgb = palette(t);',
                '    } else {',
                '      float rm = length(z);',
                '      float lf = log(max(rm, 5e-7));',
                '      float z2 = z.x * z.x + z.y * z.y;',
                '      float sp = u_mbInteriorSpin;',
                '      float csp = cos(sp * 0.52);',
                '      float ssp = sin(sp * 0.52);',
                '      float zxR = z.x * csp - z.y * ssp;',
                '      float zyR = z.x * ssp + z.y * csp;',
                '      float stripes = 0.5 + 0.5 * sin(zxR * 13.6 + zyR * 10.8 + lf * 7.2 + u_mbInteriorPhase.x);',
                '      float rings = 0.5 + 0.5 * cos(lf * 13.5 - z2 * 19.0 - u_mbInteriorPhase.y + sp * 0.72);',
                '      float weave = 0.5 + 0.5 * sin(zxR * 9.8 + zyR * 8.4 + u_mbInteriorPhase.z + sp * 0.18);',
                '      t = 0.09 + 0.47 * (stripes * 0.4 + rings * 0.38 + weave * 0.22);',
                '      t = clamp(t, 0.085, 0.6);',
                '      float tSmooth = t * t * (3.0 - 2.0 * t);',
                '      outRgb = palette(tSmooth);',
                '    }',
                '  }',
                '  gl_FragColor = vec4(outRgb, 1.0);',
                '}'
            ].join('\n')
        });
    }

    function ensureFractalBackdrop() {
        if (fractalBackdropRig) return;
        fractalBackdropMat = makeFractalBackdropMaterial();
        fractalBackdropMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fractalBackdropMat);
        fractalBackdropMesh.frustumCulled = false;
        fractalBackdropMesh.renderOrder = -1000;
        fractalBackdropMesh.position.z = -7.2;
        fractalBackdropRig = new THREE.Object3D();
        fractalBackdropRig.add(fractalBackdropMesh);
        fractalBackdropRig.visible = false;
        scene.add(fractalBackdropRig);
    }

    function layoutFractalBackdrop() {
        if (!fractalBackdropMesh) return;
        var d = -fractalBackdropMesh.position.z;
        var vFOV = THREE.Math.degToRad(camera.fov);
        var hh = 2 * Math.tan(vFOV * 0.5) * d;
        var bleed = 1.2;
        var pixAsp =
            typeof renderer !== 'undefined' && renderer.domElement
                ? renderer.domElement.clientWidth /
                  Math.max(1, renderer.domElement.clientHeight)
                : camera.aspect;
        fractalBackdropMesh.scale.set(hh * pixAsp * bleed, hh * bleed, 1);
    }

    function makeSplatFullMaterial() {
        return new THREE.RawShaderMaterial({
            uniforms: {
                uSplatScale: { value: 1.0 },
                uTime: { value: 0 }
            },
            vertexShader: [
                'precision highp float;',
                'uniform mat4 modelViewMatrix;',
                'uniform mat4 projectionMatrix;',
                'uniform float uSplatScale;',
                'attribute vec3 position;',
                'attribute vec3 instancePosition;',
                'attribute vec3 instanceColor;',
                'varying vec3 vColor;',
                'varying vec2 vXY;',
                'varying vec3 vDiskPos;',
                'void main() {',
                '  vColor = instanceColor;',
                '  vXY = position.xy;',
                '  vDiskPos = instancePosition;',
                '  vec4 mvPosition = modelViewMatrix * vec4(instancePosition, 1.0);',
                '  float zf = max(-mvPosition.z, 0.12);',
                '  mvPosition.xy += position.xy * uSplatScale * zf * 0.011;',
                '  gl_Position = projectionMatrix * mvPosition;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'precision mediump float;',
                'varying vec3 vColor;',
                'varying vec2 vXY;',
                'varying vec3 vDiskPos;',
                'uniform float uTime;',
                'void main() {',
                '  float r2 = dot(vXY, vXY);',
                '  float edge = 1.0 - smoothstep(0.94, 1.0, r2);',
                '  float a = exp(-r2 * 9.5) * edge;',
                '  if (a < 0.06) discard;',
                '  vec2 p = vDiskPos.xy;',
                '  float rad = min(length(p), 1.18);',
                '  float ang = atan(p.y, p.x) + uTime * 0.11;',
                '  float hex6 = 0.5 + 0.5 * cos(6.0 * ang);',
                '  float hex12 = 0.5 + 0.5 * cos(12.0 * ang);',
                '  float petal = mix(0.55, 1.15, pow(abs(hex6), 0.5) * (0.72 + 0.28 * hex12));',
                '  float rings = 0.58 + 0.42 * sin(rad * 19.5 + uTime * 0.4) * sin(rad * 11.3);',
                '  float ves = 0.62 + 0.38 * abs(sin(rad * 17.0)) * abs(cos(6.0 * ang));',
                '  float sacred = petal * (0.72 + 0.28 * rings) * (0.78 + 0.22 * ves);',
                '  sacred = clamp(sacred * 0.78 + 0.22, 0.32, 1.18);',
                '  float breathe = 0.5 + 0.5 * smoothstep(0.0, 0.95, rad);',
                '  vec3 rgb = vColor * sacred * (0.68 + 0.32 * breathe);',
                '  float alpha = a * 0.72 * (0.5 + 0.5 * sacred) * (0.55 + 0.45 * breathe);',
                '  gl_FragColor = vec4(rgb, alpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
    }

    function disposeSplatFullMesh() {
        if (splatFullMesh) {
            scene.remove(splatFullMesh);
            if (splatFullMesh.geometry) splatFullMesh.geometry.dispose();
            if (splatFullMesh.material) splatFullMesh.material.dispose();
            splatFullMesh = null;
        }
        splatFullInstPos = null;
        splatFullInstCol = null;
    }

    function rebuildSplatFullMesh(newN, posArr, colArr) {
        disposeSplatFullMesh();
        if (newN < 1) return;
        var q = new Float32Array([
            -1, -1, 0, 1, -1, 0, 1, 1, 0,
            -1, -1, 0, 1, 1, 0, -1, 1, 0
        ]);
        var ig = new THREE.InstancedBufferGeometry();
        ig.addAttribute('position', new THREE.BufferAttribute(q, 3));
        var ip = new THREE.InstancedBufferAttribute(new Float32Array(newN * 3), 3, 1);
        var ic = new THREE.InstancedBufferAttribute(new Float32Array(newN * 3), 3, 1);
        for (var i = 0; i < newN * 3; i++) {
            ip.array[i] = posArr[i];
            ic.array[i] = colArr[i];
        }
        ig.addAttribute('instancePosition', ip);
        ig.addAttribute('instanceColor', ic);
        ig.maxInstancedCount = newN;
        splatFullInstPos = ip;
        splatFullInstCol = ic;
        splatFullMesh = new THREE.Mesh(ig, makeSplatFullMaterial());
        splatFullMesh.frustumCulled = false;
        scene.add(splatFullMesh);
    }

    function setVisualMode(mode) {
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
        visualMode = mode;
        if (!pointsObj) return;
        disposeSplatFullMesh();
        if (prevMode === 'juliaWormhole' && visualMode !== 'juliaWormhole') {
            wormholeRestoreSceneFog();
            if (wormholeRoot) wormholeRoot.visible = false;
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
                if (wormholeRoot) wormholeRoot.visible = true;
            } else if (wormholeRoot) {
                wormholeRoot.visible = false;
            }
        }
    }
    var pointsObj = null;
    var N = 0;

    particleCapLabel.textContent = String(PARTICLE_CAP);
    particleSlider.min = String(PARTICLE_MIN);
    particleSlider.max = String(PARTICLE_CAP);
    particleSlider.step = '500';
    particleNum.min = String(PARTICLE_MIN);
    particleNum.max = String(PARTICLE_CAP);
    particleNum.step = '500';

    function seedDiskParticles(n, bx, pr, pth, pos, colors) {
        for (var i = 0; i < n; i++) {
            var u = Math.random();
            var v = Math.random();
            var r = Math.sqrt(u) * 1.12;
            var th = (v * 2 * Math.PI) + (Math.random() - 0.5) * 0.02;
            var x = r * Math.cos(th);
            var y = r * Math.sin(th);
            bx[i * 2] = x;
            bx[i * 2 + 1] = y;
            pr[i] = r;
            pth[i] = th;
            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = 0;
            colors[i * 3] = 0.1;
            colors[i * 3 + 1] = 0.2;
            colors[i * 3 + 2] = 0.5;
        }
    }

    function rebuildParticles(newN) {
        newN = particleClamp(newN);
        if (pointsObj && newN === N) {
            particleSlider.value = String(N);
            particleNum.value = String(N);
            return;
        }
        disposeSplatFullMesh();
        if (pointsObj) {
            scene.remove(pointsObj);
            pointsObj = null;
        }
        if (geom) {
            try { geom.dispose(); } catch (e0) {}
            geom = null;
        }
        N = newN;
        baseXY = new Float32Array(N * 2);
        polarR = new Float32Array(N);
        polarTh = new Float32Array(N);
        var pos = new Float32Array(N * 3);
        var colors = new Float32Array(N * 3);
        seedDiskParticles(N, baseXY, polarR, polarTh, pos, colors);
        geom = new THREE.BufferGeometry();
        geom.addAttribute('position', new THREE.BufferAttribute(pos, 3));
        geom.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        colAttr = geom.attributes.color.array;
        if (!pointsClassicMat) {
            pointsClassicMat = new THREE.PointsMaterial({
                size: 0.0095,
                vertexColors: THREE.VertexColors,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                sizeAttenuation: true
            });
            pointsMat = pointsClassicMat;
        }
        pointsObj = new THREE.Points(geom, pointsClassicMat);
        scene.add(pointsObj);
        setVisualMode(visualMode);
        particleSlider.value = String(N);
        particleNum.value = String(N);
    }

    rebuildParticles(particleGoal());
    scene.add(new THREE.AmbientLight(0x406090, 0.45));

    var particleDeb = null;
    function scheduleParticlesFromSlider() {
        var v = particleClamp(particleSlider.value);
        particleNum.value = String(v);
        particleSlider.value = String(v);
        if (particleDeb) clearTimeout(particleDeb);
        particleDeb = setTimeout(function () {
            particleDeb = null;
            rebuildParticles(particleClamp(particleSlider.value));
        }, 130);
    }
    particleSlider.addEventListener('input', scheduleParticlesFromSlider);
    particleSlider.addEventListener('change', function () {
        if (particleDeb) {
            clearTimeout(particleDeb);
            particleDeb = null;
        }
        var v = particleClamp(particleSlider.value);
        particleNum.value = String(v);
        rebuildParticles(v);
    });
    particleNum.addEventListener('change', function () {
        var v = particleClamp(particleNum.value);
        particleSlider.value = String(v);
        particleNum.value = String(v);
        if (particleDeb) {
            clearTimeout(particleDeb);
            particleDeb = null;
        }
        rebuildParticles(v);
    });

    var clock = new THREE.Clock();

    var gui = null;
    var simControls = {
        timeWarp: 1,
        heightAmp: 0.58,
        edgeRimMin: 0.3,
        motionGain: 1.12,
        interference: 0.78,
        fineRipple: 0.45,
        fftSmoothing: 0.22,
        trackBlend: 0.12,
        zExtrude: 0.48,
        pointSizeMul: 1,
        fogDensity: 0.045,
        centroidBlend: 0.58,
        trackHzSpeed: 1.25,
        fluxDecay: 0.88,
        bandSnap: 0.95,
        rmsWeight: 1.05,
        spectralLevelWeight: 1,
        transientGain: 1.1,
        subWeight: 0.55,
        beatPunch: 1.15,
        bandMotion: 0.95,
        transientRipple: 0.62,
        colorVibrance: 1.05,
        colorBeatBoost: 1,
        colorMidpoint: 0.38,
        audioReactiveColors: true,
        audioColorAmount: 1,
        audioHueSpread: 1,
        audioSatBoost: 0.85,
        audioBrightBoost: 0.65
    };

    function refreshDatGuiDisplay(root) {
        if (!root) return;
        var i;
        if (root.__controllers) {
            for (i = 0; i < root.__controllers.length; i++) {
                try { root.__controllers[i].updateDisplay(); } catch (e0) {}
            }
        }
        if (root.__folders) {
            for (i = 0; i < root.__folders.length; i++) {
                refreshDatGuiDisplay(root.__folders[i]);
            }
        }
    }

    var AGGRESSION_PRESETS = {
        balanced: {
            heightAmp: 0.58, edgeRimMin: 0.3, motionGain: 1.12, zExtrude: 0.48, fogDensity: 0.045,
            pointSizeMul: 1, interference: 0.78, fineRipple: 0.45, colorVibrance: 1.05,
            beatPunch: 1.15, bandMotion: 0.95, transientRipple: 0.62
        }
    };

    /** Param c anchor for Julia escape backdrop (wandering mode). */
    var fractalBackdropJuliaBaseCr = -0.355;
    var fractalBackdropJuliaBaseCi = 0.595;

    function applyAggressionPreset(key) {
        if (key === 'fractalMB') {
            if (typeof __cpIsAggressionAllowed === 'function' && !__cpIsAggressionAllowed('fractalMB')) {
                var _cpFbMb = typeof __cpFirstAllowedAggressionValue === 'function' ? __cpFirstAllowedAggressionValue() : 'balanced';
                if (aggressionSel) aggressionSel.value = _cpFbMb;
                applyAggressionPreset(_cpFbMb);
                return;
            }
            setVisualMode('fractalMB');
            refreshDatGuiDisplay(gui);
            return;
        }
        var __whPu =
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
            refreshDatGuiDisplay(gui);
            if (wormholeGui) refreshDatGuiDisplay(wormholeGui);
            return;
        }
        setVisualMode('points');
        var p = AGGRESSION_PRESETS[key];
        if (!p) return;
        Object.keys(p).forEach(function (k) {
            if (Object.prototype.hasOwnProperty.call(simControls, k)) {
                simControls[k] = p[k];
            }
        });
        refreshDatGuiDisplay(gui);
    }

    function wormholeRebuildScene() {
        var vis = visualMode === 'juliaWormhole';
        wormholeDisposeBuilt();
        if (vis) {
            wormholeEnsureScene();
            if (wormholeRoot) wormholeRoot.visible = true;
        }
        if (wormholeGui) refreshDatGuiDisplay(wormholeGui);
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
        var wm = wormholeGui.addFolder('Motion accents');
        wm.add(wormholeControls, 'helixFlareGain', 0, 2.5).name('helix flare gain');
        wm.add(wormholeControls, 'omStreamSpeed', 0, 0.2).name('Om stream × depth');
        wm.open();
        var wgFog = wormholeGui.addFolder('Atmosphere');
        wgFog.add(wormholeControls, 'fogDensity', 0.004, 0.06).onChange(function () {
            wormholeSyncFogFromControls();
        });
        wgFog.open();
        var wc = wormholeGui.addFolder('Colors (wormhole)');
        try {
            wc.addColor(wormholeControls, 'whColorSky').name('framed sky');
            wc.addColor(wormholeControls, 'whColorRing').name('tunnel rings');
            wc.addColor(wormholeControls, 'whColorHelix').name('helix tubes');
            wc.addColor(wormholeControls, 'whColorOm').name('Om sprites');
        } catch (eWC) {
            wc.add(wormholeControls, 'whColorSky').name('sky hex');
            wc.add(wormholeControls, 'whColorRing').name('rings hex');
            wc.add(wormholeControls, 'whColorHelix').name('helix hex');
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
                wormholeControls.omStreamSpeed = 0.05;
                wormholeControls.fractalEvolutionSpeed = 3.0;
                wormholeControls.discRadius = 0.24;
                wormholeControls.ringRadius = 8;
                wormholeControls.ringSpacing = 4;
                wormholeControls.ringCount = 72;
                wormholeControls.helixCount = 3;
                wormholeControls.wormParticleCount = 2400;
                wormholeControls.fogDensity = 0.02;
                wormholeControls.ringIntensity = 1.0;
                wormholeControls.skyIntensity = 1.05;
                wormholeControls.whColorSky = '#ffffff';
                wormholeControls.whColorRing = '#ffffff';
                wormholeControls.whColorHelix = '#ff4da8';
                wormholeControls.whColorOm = '#ffffff';
                wormholeControls.whJuliaFractColor = '#ffffff';
                whDepth = 0;
                whPrevDepth = 0;
                whVelocitySm = 0;
                wormholeRebuildScene();
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

    function setupGui() {
        gui = new dat.GUI({ width: 300 });
        var f = gui.addFolder('Cymatics field');
        f.add(simControls, 'timeWarp', 0, 2.5).name('animation speed');
        f.add(simControls, 'heightAmp', 0.35, 0.98).name('wave height amp');
        f.add(simControls, 'edgeRimMin', 0.08, 0.52).name('rim softness');
        f.add(simControls, 'motionGain', 0.2, 2.4).name('motion gain');
        f.add(simControls, 'interference', 0, 1.5).name('mode interference');
        f.add(simControls, 'fineRipple', 0, 1.2).name('fine ripples');
        f.add(simControls, 'zExtrude', 0.1, 1.35).name('depth extrude');
        f.add(simControls, 'beatPunch', 0, 2.5).name('beat / transient');
        f.add(simControls, 'bandMotion', 0, 2).name('band-driven motion');
        f.add(simControls, 'transientRipple', 0, 1.5).name('hit ripple');
        f.add(simControls, 'subWeight', 0, 1.2).name('sub drives warp');
        f.open();
        var fa = gui.addFolder('Track / FFT');
        fa.add(simControls, 'fftSmoothing', 0.05, 0.5).name('hz smooth');
        fa.add(simControls, 'trackHzSpeed', 0.5, 2).name('hz follow speed');
        fa.add(simControls, 'centroidBlend', 0, 1).name('centroid vs peak');
        fa.add(simControls, 'trackBlend', 0, 1).name('blend w. dial');
        fa.add(simControls, 'bandSnap', 0.2, 1.5).name('band reactivity');
        fa.add(simControls, 'rmsWeight', 0, 2.5).name('RMS punch');
        fa.add(simControls, 'spectralLevelWeight', 0, 2).name('FFT level');
        fa.add(simControls, 'fluxDecay', 0.75, 0.98).name('onset baseline');
        fa.add(simControls, 'transientGain', 0.5, 2.5).name('onset sensitivity');
        fa.open();
        var fc = gui.addFolder('Colors (gradient by height)');
        try {
            fc.addColor(palette, 'colorLow').name('shadow / trough');
            fc.addColor(palette, 'colorMid').name('mid / rim');
            fc.addColor(palette, 'colorHigh').name('crests');
        } catch (e) {
            fc.add(palette, 'colorLow').name('shadow hex');
            fc.add(palette, 'colorMid').name('mid hex');
            fc.add(palette, 'colorHigh').name('crest hex');
        }
        fc.add(simControls, 'colorVibrance', 0, 1.8).name('saturation');
        fc.add(simControls, 'colorMidpoint', 0.15, 0.55).name('mid split');
        fc.add(simControls, 'colorBeatBoost', 0, 2).name('flash on hits');
        fc.add(simControls, 'audioReactiveColors').name('audio-reactive colours');
        fc.add(simControls, 'audioColorAmount', 0, 1).name('blend vs manual palette');
        fc.add(simControls, 'audioHueSpread', 0.35, 1.75).name('pitch shifts palette');
        fc.add(simControls, 'audioSatBoost', 0, 1.4).name('audio saturation');
        fc.add(simControls, 'audioBrightBoost', 0, 1.4).name('audio brightness');
        fc.open();
        var fv = gui.addFolder('Visual');
        fv.add(simControls, 'pointSizeMul', 0.4, 2.2).name('point size ×');
        fv.add(simControls, 'fogDensity', 0, 0.15).name('fog');
        fv.open();
        if (typeof attachMovableDatGui === 'function') {
            var _advHost = document.getElementById('advancedControlsHost');
            attachMovableDatGui(gui, _advHost
                ? { title: 'Advanced Visual Controls', parent: _advHost }
                : { title: 'Advanced Visual Controls', initialRight: 20, initialTop: 20, zIndex: 500 });
            if (typeof __pmFsMountAdvancedGui === 'function') {
                __pmFsMountAdvancedGui();
            }
        }
    }
    setupGui();
    setupWormholeGui();
    if (aggressionSel) {
        if (typeof __cpMigrateAggressionPortalSelect === 'function') {
            __cpMigrateAggressionPortalSelect();
        }
        aggressionSel.addEventListener('change', function () {
            applyAggressionPreset(aggressionSel.value);
        });
        applyAggressionPreset(aggressionSel.value);
    }
    setTimeout(function () {
        if (window.__cpApplySubscriptionGates) window.__cpApplySubscriptionGates();
    }, 0);

    window.addEventListener('keydown', function (e) {
        if ((e.key === 'h' || e.key === 'H') && gui && gui.__pmDatGuiToggleVisibility) {
            gui.__pmDatGuiToggleVisibility();
        }
    });

    function animate() {
        requestAnimationFrame(animate);
        /* Landing + guide share portal-main--behind-landing; skip=1 removes landing UX only. */
        var __cpPm = document.querySelector('.portal-main');
        var __cpLandingSkipped = document.documentElement.classList.contains('skip-landing');
        if (
            __cpPm &&
            __cpPm.classList.contains('portal-main--behind-landing') &&
            !__cpLandingSkipped
        ) {
            clock.getDelta();
            return;
        }
        var dt = clock.getDelta();
        var time = clock.getElapsedTime();
        var dv = driveFrequencyAndLevel(time);
        var hz = dv.hz;
        var lvl = dv.level;
        var snap = dv.snap;

        if (visualMode !== 'juliaWormhole') {
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

        if (fractalBackdropMat && fractalBackdropMesh && fractalBackdropRig) {
            var showFb = fractalNow;
            fractalBackdropRig.visible = showFb;
            if (!showFb) {
                fractalSmViewInit = false;
                fractalMbTourSeg = -1;
                fractalMbJourney = 0;
                fractalMbJourneyRateSm = 1;
                fractalMbViewWobbleSm = 0;
                fractalMbInteriorPh0 = 0;
                fractalMbInteriorPh1 = 0;
                fractalMbInteriorPh2 = 0;
                fractalMbInteriorSpinAccum = 0;
                fractalMbInteriorSpinRateSm = 0.12;
                fractalMbArmDriveSlow = 0;
                fractalMbArmDriveFast = 0;
                fractalJuliaTourSeg = -1;
                fractalJuliaFlow = 0;
                fractalJuliaLegIndex = 0;
                fractalJuliaSpiralAccum = 0;
                fractalSmJSpiralAudio = 0;
                fractalJuliaFastLvl = 0;
                fractalJuliaBandDriftCr = 0;
                fractalJuliaBandDriftCi = 0;
                fractalJuliaRmsDrift = 0;
                fractalJuliaOrbitPh = 0;
                fractalJuliaOrbitPh2 = 0;
                fractalJuliaConnectEnergy = 0;
                fractalJuliaConnectSm = 0;
                fractalJuliaSmTr = 0;
                fractalJuliaDiscEffSm = 0.135;
            }
            if (showFb) {
                if (!fractalSmViewInit) {
                    fractalSmViewPos.copy(camera.position);
                    fractalSmViewQuat.copy(camera.quaternion);
                    fractalSmViewInit = true;
                } else {
                    var viewA = 1 - Math.exp(-dt / 1.55);
                    fractalSmViewPos.lerp(camera.position, viewA);
                    fractalSmViewQuat.slerp(camera.quaternion, viewA);
                }
                fractalBackdropRig.position.copy(fractalSmViewPos);
                fractalBackdropRig.quaternion.copy(fractalSmViewQuat);
                layoutFractalBackdrop();
                var vp = renderer.getSize();
                fractalBackdropMat.uniforms.u_resolution.value.set(vp.width, vp.height);
                fractalBackdropMat.uniforms.u_escapeRadius.value = 2;
                var Bf = snap.bands || null;
                fractalSmAudioLvl = fractalExpSmooth(
                    fractalSmAudioLvl,
                    lvl,
                    dt,
                    fractalMB ? 0.115 : 0.16
                );
                fractalSmAudioBT = fractalExpSmooth(
                    fractalSmAudioBT,
                    Bf ? (Bf.bass - Bf.treble) : 0,
                    dt,
                    fractalMB ? 0.125 : 0.11
                );
                var palTarget =
                    time * (fractalJulia ? 0.24 : (fractalMB ? 0.09 : 0.24)) +
                    fractalSmAudioBT *
                        (fractalJulia ? 0.22 : (fractalMB ? 0.28 : 0.55)) +
                    fractalSmAudioLvl *
                        (fractalJulia ? 0.22 : (fractalMB ? 0.2 : 0.42)) +
                    (Bf
                        ? (Bf.mid - 0.5) *
                            (fractalJulia ? 0.04 : (fractalMB ? 0.042 : 0.1))
                        : 0);
                var palTau = fractalJulia ? 0.58 : (fractalMB ? 0.44 : 0.09);
                fractalSmPal = fractalExpSmooth(fractalSmPal, palTarget, dt, palTau);
                var colorITarget =
                    0.4 + fractalSmAudioLvl * 0.42 + (Bf ? Bf.mid * 0.14 : 0);
                fractalSmColorI = fractalExpSmooth(
                    fractalSmColorI,
                    colorITarget,
                    dt,
                    fractalMB ? 0.26 : 0.15
                );
                fractalBackdropMat.uniforms.u_colorIntensity.value = fractalSmColorI;
                if (fractalMB) {
                    var mbZoomMin = -0.52;
                    var mbZoomMax = 10.85;
                    var mbSegDur = 22.4;
                    var MB_TOUR = [
                        { x: -0.75125, y: 0.10845 },
                        { x: -0.74785, y: 0.11815 },
                        { x: -0.74535, y: 0.12475 },
                        { x: -0.743643887037151, y: 0.131825904037152 },
                        { x: -0.743003, y: 0.126201 },
                        { x: -0.74232, y: 0.13212 },
                        { x: -0.74488, y: 0.12835 },
                        { x: -0.74695, y: 0.12015 },
                        { x: -0.74942, y: 0.11472 },
                        { x: -0.743643887037151, y: 0.131825904037152 }
                    ];
                    var mbLen = MB_TOUR.length;
                    var mbNeedHardSnap = fractalMbTourSeg === -1;
                    if (fractalMbTourSeg === -1) {
                        fractalMbTourSeg = 1;
                        fractalMbJourney = 0;
                    }
                    var mbZoomRate =
                        1.1 +
                        fractalSmAudioLvl * 0.92 +
                        (Bf ? Bf.mid * 0.26 : 0);
                    mbZoomRate = Math.max(0.92, Math.min(2.52, mbZoomRate));
                    var mbDriveMul = 1 + fractalSmAudioLvl * 0.14;
                    var mbRateRaw = mbZoomRate * mbDriveMul;
                    if (mbNeedHardSnap) {
                        fractalMbJourneyRateSm = mbRateRaw;
                    } else {
                        fractalMbJourneyRateSm = fractalExpSmooth(
                            fractalMbJourneyRateSm,
                            mbRateRaw,
                            dt,
                            0.72
                        );
                    }
                    fractalMbJourney += (dt / mbSegDur) * fractalMbJourneyRateSm;
                    var mbTourLaps = fractalMbJourney / mbLen;
                    var mbTourPhase = mbTourLaps - Math.floor(mbTourLaps);
                    var mbTau = 6.283185307179586 * mbTourLaps;
                    var mbZt = 0.5 - 0.5 * Math.cos(mbTau);
                    mbZt = mbZt * mbZt * (3 - 2 * mbZt);
                    var mbZoomNorm = mbZt;
                    mbZoomNorm = mbZoomNorm * mbZoomNorm * (3 - 2 * mbZoomNorm);
                    var mbZoomSpan = mbZoomMax - mbZoomMin;
                    var mbZoomLo = mbZoomMin + mbZoomSpan * 0.035;
                    var mbTargetZoom = mbZoomLo + mbZoomNorm * (mbZoomMax * 0.995 - mbZoomLo);
                    mbTargetZoom = Math.max(-0.58, Math.min(10.65, mbTargetZoom));
                    var mbSegFloat = mbTourPhase * mbLen;
                    if (mbSegFloat >= mbLen) { mbSegFloat = mbLen - 1e-7; }
                    var mbSegI = Math.floor(mbSegFloat);
                    var mbI = ((mbSegI % mbLen) + mbLen) % mbLen;
                    var mbNextI = (mbI + 1) % mbLen;
                    var mbLegT = mbSegFloat - mbSegI;
                    if (mbLegT < 0) { mbLegT = 0; }
                    if (mbLegT > 1) { mbLegT = 1; }
                    var mbEase = mbLegT * mbLegT * (3 - 2 * mbLegT);
                    var mbCx =
                        MB_TOUR[mbI].x +
                        mbEase * (MB_TOUR[mbNextI].x - MB_TOUR[mbI].x);
                    var mbCy =
                        MB_TOUR[mbI].y +
                        mbEase * (MB_TOUR[mbNextI].y - MB_TOUR[mbI].y);
                    var mbOvThr = 0.22;
                    if (mbTargetZoom < mbOvThr) {
                        var mbOb = (mbOvThr - mbTargetZoom) / (mbOvThr - mbZoomMin);
                        if (mbOb > 1) { mbOb = 1; }
                        if (mbOb < 0) { mbOb = 0; }
                        var mbOvCx = -0.55;
                        var mbOvCy = 0;
                        mbCx = mbCx * (1 - mbOb) + mbOvCx * mbOb;
                        mbCy = mbCy * (1 - mbOb) + mbOvCy * mbOb;
                    }
                    var mbFine =
                        fractalSmAudioLvl * 12 +
                        (Bf
                            ? (Bf.mid - 0.5) * 12 +
                                (Bf.treble - 0.5) * 13 +
                                (Bf.high - 0.5) * 13 +
                                (Bf.bass - 0.5) * 9 +
                                (Bf.lowMid - 0.5) * 10
                            : 0);
                    var maxIterTarget = Math.min(
                        520,
                        Math.max(
                            124,
                            104 +
                                mbTargetZoom * 56 +
                                mbFine +
                                tr * 8
                        )
                    );
                    if (mbNeedHardSnap) {
                        fractalSmZoom = mbTargetZoom;
                        fractalSmCx = mbCx;
                        fractalSmCy = mbCy;
                    } else {
                        fractalSmZoom = fractalExpSmooth(fractalSmZoom, mbTargetZoom, dt, 0.62);
                        fractalSmCx = fractalExpSmooth(fractalSmCx, mbCx, dt, 0.52);
                        fractalSmCy = fractalExpSmooth(fractalSmCy, mbCy, dt, 0.52);
                    }
                    fractalSmMaxIter = fractalExpSmooth(
                        fractalSmMaxIter,
                        maxIterTarget,
                        dt,
                        0.72
                    );
                    var mbInPh0T =
                        fractalSmZoom * 0.16 + fractalSmPal * 0.4 +
                        (Bf ? (Bf.mid - 0.5) * 0.07 : 0);
                    var mbInPh1T = fractalSmPal * 1.02 + fractalSmZoom * 0.11 + time * 0.055;
                    var mbInPh2T = fractalSmPal * 1.78 + fractalSmAudioLvl * 0.085;
                    fractalMbInteriorPh0 = fractalExpSmooth(
                        fractalMbInteriorPh0,
                        mbInPh0T,
                        dt,
                        0.58
                    );
                    fractalMbInteriorPh1 = fractalExpSmooth(
                        fractalMbInteriorPh1,
                        mbInPh1T,
                        dt,
                        0.64
                    );
                    fractalMbInteriorPh2 = fractalExpSmooth(
                        fractalMbInteriorPh2,
                        mbInPh2T,
                        dt,
                        0.54
                    );
                    fractalBackdropMat.uniforms.u_mbInteriorPhase.value.set(
                        fractalMbInteriorPh0,
                        fractalMbInteriorPh1,
                        fractalMbInteriorPh2
                    );
                    var rmsMb = snap.rms != null ? snap.rms : 0;
                    var mbSpinTarget =
                        0.055 +
                        fractalSmAudioLvl * 1.95 +
                        lvl * 1.5 +
                        (Bf
                            ? Bf.mid * 0.52 +
                                Bf.bass * 0.28 +
                                (Bf.treble - 0.5) * 0.12
                            : 0) +
                        tr * 0.35 +
                        rmsMb * 0.45;
                    mbSpinTarget = Math.max(0.028, Math.min(3.5, mbSpinTarget));
                    fractalMbInteriorSpinRateSm = fractalExpSmooth(
                        fractalMbInteriorSpinRateSm,
                        mbSpinTarget,
                        dt,
                        0.19
                    );
                    fractalMbInteriorSpinAccum += dt * fractalMbInteriorSpinRateSm;
                    fractalBackdropMat.uniforms.u_mbInteriorSpin.value =
                        fractalMbInteriorSpinAccum;
                    var mbArmRaw =
                        fractalSmAudioLvl * 0.58 +
                        lvl * 0.52 +
                        (Bf
                            ? Bf.treble * 0.45 +
                                Bf.high * 0.4 +
                                (Bf.mid - 0.5) * 0.18
                            : 0) +
                        tr * 0.58 +
                        rmsMb * 0.52;
                    fractalMbArmDriveSlow = fractalExpSmooth(
                        fractalMbArmDriveSlow,
                        mbArmRaw,
                        dt,
                        0.17
                    );
                    fractalMbArmDriveFast = fractalExpSmooth(
                        fractalMbArmDriveFast,
                        mbArmRaw,
                        dt,
                        0.058
                    );
                    fractalBackdropMat.uniforms.u_mbArmDrive.value = Math.min(
                        1.35,
                        fractalMbArmDriveSlow * 0.4 + fractalMbArmDriveFast * 0.6
                    );
                    fractalBackdropMat.uniforms.u_isJulia.value = 0;
                    fractalBackdropMat.uniforms.u_center.value.set(fractalSmCx, fractalSmCy);
                    fractalBackdropMat.uniforms.u_zoom.value = fractalSmZoom;
                    fractalBackdropMat.uniforms.u_maxIter.value = fractalSmMaxIter;
                    fractalBackdropMat.uniforms.u_paletteOffset.value = fractalSmPal;
                    var mbViewWobbleTarget =
                        fractalSmAudioBT * 0.05 +
                        (Bf ? (Bf.treble - 0.5) * 0.032 + (Bf.high - 0.5) * 0.028 : 0);
                    fractalMbViewWobbleSm = fractalExpSmooth(
                        fractalMbViewWobbleSm,
                        mbViewWobbleTarget,
                        dt,
                        0.15
                    );
                    fractalBackdropMat.uniforms.u_viewAngle.value =
                        time * 0.033 + fractalMbViewWobbleSm;
                    fractalBackdropMat.uniforms.u_spiralPhase.value = 0;
                } else {
                    fractalBackdropMat.uniforms.u_isJulia.value = 1;
                    fractalBackdropMat.uniforms.u_viewAngle.value = time * 0.072;
                    var juliaNeedSnap = fractalJuliaTourSeg === -1;
                    if (fractalJuliaTourSeg === -1) {
                        fractalJuliaTourSeg = 1;
                        fractalJuliaFlow = 0;
                        fractalJuliaLegIndex = 0;
                    }
                    var jLvlDrive = fractalSmAudioLvl * 0.52 + lvl * 0.48;
                    var rmsN = snap.rms != null ? snap.rms : 0;
                    var fluxN = snap.fluxNorm != null ? snap.fluxNorm : 0;
                    fractalJuliaConnectEnergy +=
                        dt *
                        (3.35 * tr + 2.5 * fluxN + 1.12 * rmsN + 0.34 * lvl);
                    fractalJuliaConnectEnergy *= Math.exp(-dt * 1.02);
                    fractalJuliaConnectEnergy = Math.min(2.65, fractalJuliaConnectEnergy);
                    fractalJuliaConnectSm = fractalExpSmooth(
                        fractalJuliaConnectSm,
                        fractalJuliaConnectEnergy,
                        dt,
                        0.11
                    );
                    fractalJuliaSmTr = fractalExpSmooth(fractalJuliaSmTr, tr, dt, 0.092);
                    var trJ = fractalJuliaSmTr * 0.8 + tr * 0.2;
                    fractalJuliaOrbitPh +=
                        dt *
                        (0.287 +
                            lvl * 0.403 +
                            fractalSmAudioLvl * 0.496 +
                            rmsN * 0.558 +
                            trJ * 0.232 +
                            fluxN * 0.28 +
                            (Bf
                                ? Bf.mid * 0.202 +
                                    Bf.bass * 0.155 +
                                    Bf.lowMid * 0.112
                                : 0));
                    fractalJuliaOrbitPh2 +=
                        dt *
                        (0.229 +
                            jLvlDrive * 0.357 +
                            rmsN * 0.465 +
                            trJ * 0.202 +
                            fluxN * 0.22 +
                            (Bf ? Bf.high * 0.093 + Bf.treble * 0.085 : 0));
                    fractalJuliaFastLvl = fractalExpSmooth(
                        fractalJuliaFastLvl,
                        jLvlDrive,
                        dt,
                        0.17
                    );
                    var jBreath = fractalJuliaFastLvl - fractalSmAudioLvl;
                    var bandMixCr =
                        Bf
                            ? (Bf.mid - 0.5) * 0.11 +
                                (Bf.bass - Bf.treble) * 0.07 +
                                (Bf.lowMid - 0.5) * 0.08 +
                                (Bf.high - 0.5) * 0.04
                            : 0;
                    var bandMixCi =
                        Bf
                            ? (Bf.mid - 0.5) * 0.1 +
                                (Bf.lowMid - Bf.high) * 0.065 +
                                Bf.sub * 0.06 +
                                (0.5 - Bf.treble) * 0.045
                            : 0;
                    fractalJuliaBandDriftCr = fractalExpSmooth(
                        fractalJuliaBandDriftCr,
                        bandMixCr,
                        dt,
                        0.32
                    );
                    fractalJuliaBandDriftCi = fractalExpSmooth(
                        fractalJuliaBandDriftCi,
                        bandMixCi,
                        dt,
                        0.32
                    );
                    fractalJuliaRmsDrift = fractalExpSmooth(
                        fractalJuliaRmsDrift,
                        rmsN * 0.16 + trJ * 0.11,
                        dt,
                        0.36
                    );
                    var hz01x = hzToPalette01(hz);
                    var jOrbCr =
                        0.065 * Math.sin(fractalJuliaOrbitPh) +
                        0.057 *
                            Math.cos(
                                fractalJuliaOrbitPh * 0.74 + hz01x * 6.28318 * 0.45
                            ) +
                        0.05 *
                            Math.sin(
                                fractalJuliaOrbitPh2 * 1.29 + hz01x * 6.28318 * 0.52
                            ) +
                        0.042 *
                            Math.cos(
                                fractalJuliaOrbitPh * 0.42 - fractalJuliaOrbitPh2 * 0.91
                            );
                    var jOrbCi =
                        0.062 * Math.cos(fractalJuliaOrbitPh * 0.89) +
                        0.054 *
                            Math.sin(
                                fractalJuliaOrbitPh2 * 0.94 + hz01x * 6.28318 * 0.41
                            ) +
                        0.047 *
                            Math.cos(
                                fractalJuliaOrbitPh * 1.08 + fractalJuliaOrbitPh2 * 0.57
                            ) +
                        0.04 *
                            Math.sin(fractalJuliaOrbitPh2 * 1.38);
                    var jSlowRing =
                        Math.sin(
                            fractalJuliaOrbitPh * 1.08 + hz01x * 4.2 + fractalJuliaRmsDrift * 1.8
                        ) *
                        (0.024 + fractalJuliaRmsDrift * 0.075);
                    var jSlowRingI =
                        Math.cos(
                            fractalJuliaOrbitPh2 * 1.02 + hz01x * 3.95 + fractalJuliaRmsDrift * 1.6
                        ) *
                        (0.022 + fractalJuliaRmsDrift * 0.07);
                    var jBaseCr = fractalBackdropJuliaBaseCr;
                    var jBaseCi = fractalBackdropJuliaBaseCi;
                    var jDiscMaxEff = Math.min(
                        0.172,
                        0.122 + fractalJuliaSmTr * 0.044 + jLvlDrive * 0.021
                    );
                    fractalJuliaDiscEffSm = fractalExpSmooth(
                        fractalJuliaDiscEffSm,
                        jDiscMaxEff,
                        dt,
                        0.15
                    );
                    var jConnK = fractalJuliaConnectSm * 0.056;
                    var jcrT =
                        jBaseCr +
                        jLvlDrive * 0.11 +
                        jBreath * 0.09 +
                        fractalJuliaBandDriftCr * 0.94 +
                        fractalSmAudioBT * 0.05 +
                        trJ * 0.042 +
                        jOrbCr +
                        jSlowRing +
                        jConnK * -0.846 +
                        fractalJuliaConnectSm * 0.018 * Math.sin(hz01x * 6.28318);
                    var jciT =
                        jBaseCi +
                        jLvlDrive * 0.104 +
                        jBreath * 0.082 +
                        fractalJuliaBandDriftCi * 0.94 +
                        fractalSmAudioBT * 0.046 +
                        trJ * 0.039 +
                        jOrbCi +
                        jSlowRingI +
                        jConnK * -0.537 +
                        fractalJuliaConnectSm * 0.018 * Math.cos(hz01x * 6.28318);
                    var jdx = jcrT - jBaseCr;
                    var jdy = jciT - jBaseCi;
                    var jD2 = jdx * jdx + jdy * jdy;
                    if (jD2 > fractalJuliaDiscEffSm * fractalJuliaDiscEffSm) {
                        var jS = fractalJuliaDiscEffSm / Math.sqrt(jD2);
                        jcrT = jBaseCr + jdx * jS;
                        jciT = jBaseCi + jdy * jS;
                    }
                    if (juliaNeedSnap) {
                        fractalSmJcr = jcrT;
                        fractalSmJci = jciT;
                    } else {
                        fractalSmJcr = fractalExpSmooth(fractalSmJcr, jcrT, dt, 0.155);
                        fractalSmJci = fractalExpSmooth(fractalSmJci, jciT, dt, 0.155);
                    }
                    jdx = fractalSmJcr - jBaseCr;
                    jdy = fractalSmJci - jBaseCi;
                    jD2 = jdx * jdx + jdy * jdy;
                    if (jD2 > fractalJuliaDiscEffSm * fractalJuliaDiscEffSm) {
                        var jS2 = fractalJuliaDiscEffSm / Math.sqrt(jD2);
                        fractalSmJcr = jBaseCr + jdx * jS2;
                        fractalSmJci = jBaseCi + jdy * jS2;
                    }
                    fractalBackdropMat.uniforms.u_c.value.set(fractalSmJcr, fractalSmJci);
                    var juliaZoomFixed = 0.48;
                    fractalBackdropMat.uniforms.u_center.value.set(0, 0);
                    fractalBackdropMat.uniforms.u_zoom.value = juliaZoomFixed;
                    fractalSmJZoom = juliaZoomFixed;
                    fractalSmJPx = 0;
                    fractalSmJPy = 0;
                    fractalJuliaSpiralAccum +=
                        dt *
                        (0.118 +
                            lvl * 0.07 +
                            fractalSmAudioLvl * 0.075 +
                            jLvlDrive * 0.062 +
                            fractalJuliaRmsDrift * 0.14 +
                            rmsN * 0.09 +
                            fluxN * 0.11 +
                            (Bf ? Bf.mid * 0.036 + Bf.lowMid * 0.026 : 0));
                    var jSpiralAudioT =
                        fractalSmAudioLvl * 0.55 +
                        jLvlDrive * 0.36 +
                        lvl * 0.22 +
                        fractalJuliaRmsDrift * 0.45 +
                        rmsN * 0.5 +
                        trJ * 0.22 +
                        fluxN * 0.42 +
                        (Bf ? Bf.bass * 0.26 + Bf.lowMid * 0.2 + (Bf.mid - 0.5) * 0.17 : 0) +
                        0.35 * Math.sin(fractalJuliaOrbitPh * 0.31) +
                        0.28 * Math.cos(fractalJuliaOrbitPh2 * 0.37);
                    fractalSmJSpiralAudio = fractalExpSmooth(
                        fractalSmJSpiralAudio,
                        jSpiralAudioT,
                        dt,
                        0.32
                    );
                    fractalBackdropMat.uniforms.u_spiralPhase.value =
                        fractalJuliaSpiralAccum + fractalSmJSpiralAudio;
                    var jMaxT = Math.min(
                        450,
                        Math.max(
                            232,
                            218 +
                                fractalSmAudioLvl * 48 +
                                jLvlDrive * 40 +
                                lvl * 22 +
                                fractalJuliaRmsDrift * 32 +
                                rmsN * 38 +
                                (Bf ? Bf.mid * 40 + Bf.lowMid * 16 : 0) +
                                trJ * 26 +
                                fluxN * 32 +
                                fractalJuliaConnectSm * 14 +
                                28 * Math.sin(fractalJuliaOrbitPh * 0.48) +
                                22 * Math.cos(fractalJuliaOrbitPh2 * 0.41)
                        )
                    );
                    fractalSmJMaxIter = fractalExpSmooth(fractalSmJMaxIter, jMaxT, dt, 0.34);
                    fractalBackdropMat.uniforms.u_maxIter.value = fractalSmJMaxIter;
                    fractalBackdropMat.uniforms.u_paletteOffset.value = fractalSmPal;
                }
            }
        }
        if (!fractalNow && !wormholeNow) {
            for (var i = 0; i < N; i++) {
                var x0 = baseXY[i * 2];
                var y0 = baseXY[i * 2 + 1];
                var r = polarR[i];
                var th = polarTh[i];
                var ix = i * 3;
                arr[ix] = x0;
                arr[ix + 1] = y0;
                var h = waveHeight(r, th, time, hz, lvl, snap);
                arr[ix + 2] = h * zScale;
                heightToColor(h * 0.95, tr, colAttr, ix, snap);
                if (splatFullNow) {
                    spA[ix] = arr[ix];
                    spA[ix + 1] = arr[ix + 1];
                    spA[ix + 2] = arr[ix + 2];
                    scA[ix] = colAttr[ix];
                    scA[ix + 1] = colAttr[ix + 1];
                    scA[ix + 2] = colAttr[ix + 2];
                }
            }
            geom.attributes.position.needsUpdate = true;
            geom.attributes.color.needsUpdate = true;
        }
        if (splatFullNow) {
            splatFullInstPos.needsUpdate = true;
            splatFullInstCol.needsUpdate = true;
        }

        var baseSize = (N > 25000 ? 0.0068 : N > 14000 ? 0.008 : 0.0095) * simControls.pointSizeMul;
        if (pointsClassicMat) {
            pointsClassicMat.size = baseSize;
        }
        if (splatFullMesh && splatFullMesh.material && splatFullMesh.material.uniforms) {
            splatFullMesh.material.uniforms.uSplatScale.value = Math.max(0.38, baseSize * 34.0);
            if (splatFullMesh.material.uniforms.uTime) {
                splatFullMesh.material.uniforms.uTime.value = time;
            }
        }

        if (wormholeNow) {
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
            ? (' · Julia wormhole' + __whReadout)
            : fractalMB
                ? ' · Mandelbrot'
                : fractalJulia
                    ? ' · Julia'
                    : '';
        readout.textContent =
            'Particles: ' + N +
            ' · Drive Hz: ' + hz.toFixed(1) +
            ' · Lobes ~' + lobes + fractalTag;

        renderer.render(scene, camera);
    }
    animate();
})();