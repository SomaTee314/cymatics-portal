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
                sessionMinutes: null
            };
        }
        if (!d) {
            return {
                tier: 'free',
                isDevMode: false,
                allowFractalVisuals: false,
                allowMic: false,
                allowCustomHz: false,
                allowedPresetIndices: [0, 5, 6],
                exportWatermark: true,
                sessionMinutes: 15
            };
        }
        return {
            tier: d.tier || 'free',
            isDevMode: false,
            allowFractalVisuals: !!d.allowFractalVisuals,
            allowMic: !!d.allowMic,
            allowCustomHz: !!d.allowCustomHz,
            allowedPresetIndices:
                d.allowedPresetIndices === undefined ? null : d.allowedPresetIndices,
            exportWatermark: !!d.exportWatermark,
            sessionMinutes:
                d.sessionMinutes !== undefined && d.sessionMinutes !== null
                    ? d.sessionMinutes
                    : null
        };
    }

    function __cpSubscriptionSignature(data) {
        try {
            return JSON.stringify({
                tier: data.tier || 'free',
                allowedPresetIndices: data.allowedPresetIndices,
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
            opt.disabled = !ok;
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
        for (i = 0; i < aggressionSel.options.length; i++) {
            var opt = aggressionSel.options[i];
            if (opt.value === 'fractalMB' || opt.value === 'fractalJulia') {
                opt.disabled = !se.allowFractalVisuals;
                opt.title =
                    !se.allowFractalVisuals && !se.isDevMode ? __CP_UPGRADE_TIP : '';
            } else {
                opt.disabled = false;
                opt.title = '';
            }
        }
        if (!se.allowFractalVisuals &&
            (aggressionSel.value === 'fractalMB' ||
                aggressionSel.value === 'fractalJulia')) {
            aggressionSel.value = 'balanced';
        }
    }

    function __cpApplyModeOptionGate() {
        if (!modeSel) return;
        var se = __cpSubEffective();
        var i;
        for (i = 0; i < modeSel.options.length; i++) {
            var opt = modeSel.options[i];
            if (opt.value === 'track') {
                opt.disabled = !se.allowMic;
                opt.title =
                    !se.allowMic && !se.isDevMode ? __CP_UPGRADE_TIP : '';
            } else if (opt.value === 'manual') {
                opt.disabled = !se.allowCustomHz;
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

    function __cpEnsureUpgradeControl() {
        if (window.parent === window) return;
        var el = document.getElementById('cp-shell-upgrade');
        if (!el) {
            el = document.createElement('div');
            el.id = 'cp-shell-upgrade';
            el.style.cssText = 'margin-top:8px;font-size:12px;line-height:1.4;';
            var a = document.createElement('a');
            a.href = '#';
            a.textContent = 'Upgrade for full access \u2192';
            a.style.cssText = 'color:#7eb8ff;text-decoration:underline;cursor:pointer;';
            a.addEventListener('click', function (ev) {
                ev.preventDefault();
                try {
                    window.parent.postMessage(
                        { type: 'cp-action', action: 'upgrade-clicked' },
                        '*'
                    );
                } catch (e5) {}
            });
            el.appendChild(a);
            var col = document.getElementById('pmFrequencyControlCol');
            if (col) col.appendChild(el);
        }
        var se = __cpSubEffective();
        el.style.display =
            !se.isDevMode && se.tier === 'free' ? '' : 'none';
    }

    /**
     * After free-tier gating, HTML defaults and early gate passes may leave preset + balanced.
     * Once subscription unlocks (trial/pro/etc.), restore the intended product defaults.
     */
    function __cpApplyUnlockedProductDefaults() {
        var se = __cpSubEffective();
        if (!se.allowMic || !se.allowFractalVisuals) {
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
        if (aggressionSel.value !== 'fractalJulia') {
            aggressionSel.value = 'fractalJulia';
            try {
                aggressionSel.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (eCh1) {
                /* no-op */
            }
        }
    }

    window.__cpApplySubscriptionGates = function () {
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
        __cpEnsureUpgradeControl();
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
            allowFractalVisuals: false,
            allowMic: false,
            allowCustomHz: false,
            exportWatermark: true
        };
        window.__cpApplySubscriptionGates();
    }, 3000);

    window.__cpApplySubscriptionGates();

    try {
        if (!sessionStorage.getItem('cp_session_bumped')) {
            sessionStorage.setItem('cp_session_bumped', '1');
            var sc =
                parseInt(localStorage.getItem('cp_session_count') || '0', 10) + 1;
            localStorage.setItem('cp_session_count', String(sc));
        }
    } catch (e7) {}

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
