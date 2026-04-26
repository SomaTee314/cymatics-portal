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
                : ag.indexOf('fractalMB') >= 0 || ag.indexOf('fractalJulia') >= 0;
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

    window.__cpIsAggressionAllowed = function (key) {
        var se = __cpSubEffective();
        if (se.isDevMode) return true;
        var a = se.allowedAggressionValues;
        if (a == null) return true;
        return a.indexOf(key) >= 0;
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
                var ok = allow.indexOf(opt.value) >= 0;
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
            allow.indexOf(aggressionSel.value) < 0
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
            if (allow.indexOf(v) >= 0) {
                __cpLastGatedAggressionValue = v;
                return;
            }
            __cpIgnoreAggroChange = true;
            var back =
                __cpLastGatedAggressionValue &&
                allow.indexOf(__cpLastGatedAggressionValue) >= 0
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

    function __cpEnsureUpgradeControl() {
        if (window.parent === window) return;
        var el = document.getElementById('cp-shell-upgrade');
        if (!el) {
            el = document.createElement('div');
            el.id = 'cp-shell-upgrade';
            el.style.cssText = 'margin-top:8px;font-size:12px;line-height:1.4;';
            var a = document.createElement('a');
            a.href = '#';
            a.textContent = 'Create account to unlock \u2192';
            a.style.cssText = 'color:#7eb8ff;text-decoration:underline;cursor:pointer;';
            a.addEventListener('click', function (ev) {
                ev.preventDefault();
                try {
                    window.parent.postMessage(
                        { type: 'cp-action', action: 'signup-prompt' },
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
        if (selPreset) {
            __cpLastGatedPresetValue = selPreset.value;
        }
        if (aggressionSel) {
            var sea = __cpSubEffective().allowedAggressionValues;
            if (
                sea == null ||
                sea.indexOf(aggressionSel.value) >= 0
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
