/**
 * Fullscreen visual + sidebar: hover shows a peek; click icon pins full panel; click again collapses.
 */
(function (global) {
    var styled = false;
    var dockBuilt = false;
    var dockEl = null;
    var asideFreq = null;
    var asideAudio = null;
    var btnToggle = null;

    function containsNode(parent, node) {
        if (!parent || !node) return false;
        return parent === node || parent.contains(node);
    }

    function injectStyles() {
        if (styled) return;
        styled = true;
        var s = document.createElement('style');
        s.id = 'pm-visual-fs-styles';
        s.textContent = [
            '#portal-container:fullscreen,#portal-container:-webkit-full-screen{',
            'width:100%!important;height:100%!important;max-width:none!important;aspect-ratio:unset!important;',
            'min-height:0!important;margin:0!important;border-radius:0!important;overflow:hidden!important;',
            'touch-action:manipulation;-webkit-tap-highlight-color:transparent;}',
            '#portal-container:fullscreen canvas,',
            '#portal-container:-webkit-full-screen canvas{border-radius:0!important;}',
            '#portal-container.visual-fs-css-target{',
            'position:fixed!important;inset:0!important;z-index:2147482000!important;',
            'width:100vw!important;height:100vh!important;height:100dvh!important;max-width:none!important;aspect-ratio:unset!important;',
            'min-height:0!important;margin:0!important;border-radius:0!important;overflow:hidden!important;',
            'touch-action:manipulation;-webkit-tap-highlight-color:transparent;}',
            '#portal-container.visual-fs-css-target canvas{border-radius:0!important;}',
            'body.visual-fs-css-on{overscroll-behavior:none;}',
            '#portal-container:fullscreen .visual-fs-dock,#portal-container:-webkit-full-screen .visual-fs-dock,',
            '#portal-container.visual-fs-css-target .visual-fs-dock{display:flex!important;}',
            '.visual-fs-dock{display:none;position:absolute;left:0;top:0;bottom:0;z-index:60;',
            'flex-direction:column;justify-content:center;pointer-events:none;}',
            '.visual-fs-rail{pointer-events:auto;display:flex;flex-direction:column;gap:12px;padding:14px 8px;',
            'margin:12px 0;background:linear-gradient(90deg,rgba(6,8,16,0.72) 0%,rgba(6,8,16,0.35) 70%,transparent 100%);',
            'border-radius:0 14px 14px 0;border:1px solid rgba(255,248,224,0.12);border-left:none;}',
            '.visual-fs-slot{position:relative;display:flex;align-items:center;z-index:61;}',
            '.visual-fs-slot--open{z-index:70;}',
            'button.visual-fs-icon{box-sizing:border-box;width:48px;height:48px;padding:0;margin:0;border-radius:12px;',
            'border:1px solid rgba(255,248,224,0.38);background:rgba(255,248,224,0.1);color:var(--cream);',
            'cursor:pointer;display:flex;align-items:center;justify-content:center;',
            'font-size:20px;font-weight:600;line-height:0;transition:background .2s,border-color .2s,transform .2s;}',
            'button.visual-fs-icon svg{display:block;}',
            'button.visual-fs-icon:hover,button.visual-fs-icon:focus-visible{background:rgba(255,248,224,0.2);outline:none;',
            'border-color:var(--accent-cyan);transform:scale(1.04);}',
            'button.visual-fs-icon:focus-visible{box-shadow:0 0 0 2px rgba(0,212,255,0.35);}',
            'button.visual-fs-icon[data-pm-pinned=\"true\"]{background:rgba(0,212,255,0.15);border-color:var(--accent-cyan);}',
            '.visual-fs-panel{position:absolute;left:calc(100% + 10px);top:50%;transform:translate(-16px,-50%);',
            'width:min(380px,calc(100vw - 100px));max-height:min(70vh,820px);overflow:auto;overflow-x:hidden;',
            'opacity:0;pointer-events:none;transition:opacity .35s ease,transform .4s cubic-bezier(0.22,1,0.36,1),max-height .35s ease;',
            'padding:4px 6px 4px 2px;box-sizing:border-box;-webkit-overflow-scrolling:touch;}',
            '.visual-fs-slot--pinned .visual-fs-panel{max-height:min(88vh,900px);}',
            '.visual-fs-slot--open .visual-fs-panel{',
            'opacity:1;pointer-events:auto;transform:translate(0,-50%);}',
            '.visual-fs-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;',
            'flex-shrink:0;position:sticky;top:0;z-index:3;margin:-2px -4px 8px -2px;padding:8px 10px;',
            'background:rgba(4,6,12,0.95);border-bottom:1px solid rgba(255,248,224,0.14);',
            'border-radius:10px 10px 0 0;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);}',
            '.visual-fs-panel-title{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;',
            'opacity:0.88;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            'button.visual-fs-close{box-sizing:border-box;flex-shrink:0;width:36px;height:36px;padding:0;margin:0;',
            'border-radius:10px;border:1px solid rgba(255,248,224,0.4);background:rgba(255,248,224,0.12);',
            'color:var(--cream);font-size:22px;line-height:1;font-weight:400;cursor:pointer;display:flex;',
            'align-items:center;justify-content:center;transition:background .15s,border-color .15s,transform .12s;}',
            'button.visual-fs-close:hover,button.visual-fs-close:focus-visible{background:rgba(255,80,80,0.25);',
            'border-color:rgba(255,120,120,0.65);color:#fff;outline:none;transform:scale(1.05);}',
            'button.visual-fs-close:focus-visible{box-shadow:0 0 0 2px rgba(255,120,120,0.4);}',
            '.visual-fs-panel .pm-portal-ctrl-shell{max-height:min(85vh,880px)!important;width:100%!important;}',
            '.visual-fs-panel .pm-dat-gui-shell{max-height:min(85vh,880px)!important;width:100%!important;}',
            '.visual-fs-panel .pm-dat-gui-body{max-height:min(72vh,700px)!important;}',
            'button.visual-fs-toggle{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;',
            'width:36px;height:30px;padding:0;margin:0 0 0 8px;border-radius:8px;',
            'border:1px solid rgba(255,248,224,0.35);background:rgba(255,248,224,0.08);color:var(--cream);cursor:pointer;}',
            'button.visual-fs-toggle:hover{background:rgba(255,248,224,0.15);}',
            '@supports not (gap:12px){.visual-fs-rail>*+*{margin-top:12px;}}',
            '@supports not (gap:10px){.visual-fs-panel-head>*+*{margin-left:10px;}}',
            '.status-bar{gap:8px;flex-wrap:wrap;}'
        ].join('');
        document.head.appendChild(s);
    }

    function getShell(hostId) {
        return document.querySelector('.pm-portal-ctrl-shell[data-pm-ctrl-host="' + hostId + '"]');
    }

    function getHost(hostId) {
        return document.getElementById(hostId);
    }

    function resetShellLayoutForEmbed(shell) {
        if (!shell) return;
        shell.style.position = 'relative';
        shell.style.left = '';
        shell.style.top = '';
        shell.style.right = '';
        shell.style.width = '100%';
        shell.style.maxWidth = '';
        shell.style.zIndex = '';
        shell.style.boxSizing = 'border-box';
        shell.classList.add('pm-portal-ctrl-shell--embedded');
    }

    function moveShellInto(aside, hostId) {
        var sh = getShell(hostId);
        if (!sh || !aside) return;
        aside.appendChild(sh);
        resetShellLayoutForEmbed(sh);
    }

    function restoreShellsToGrid() {
        moveShellIntoHost('pmFrequencyControlCol');
        moveShellIntoHost('pmAudioEngineCol');
    }

    function moveShellIntoHost(hostId) {
        var host = getHost(hostId);
        var sh = getShell(hostId);
        if (host && sh) {
            host.appendChild(sh);
            resetShellLayoutForEmbed(sh);
        }
    }

    function getAdvShell() {
        return document.querySelector('.pm-dat-gui-shell[data-pm-dock-home="advancedControlsHost"]')
            || document.querySelector('#advancedControlsHost .pm-dat-gui-shell')
            || document.querySelector('.pm-dat-gui-shell');
    }

    function resetDatGuiShellForFlyout(shell) {
        if (!shell) return;
        shell.style.position = 'relative';
        shell.style.left = '';
        shell.style.top = '';
        shell.style.right = '';
        shell.style.width = '100%';
        shell.style.maxWidth = '100%';
        shell.style.boxSizing = 'border-box';
        shell.style.zIndex = '';
        shell.classList.add('pm-dat-gui-shell--embedded');
    }

    /** Keep dat.GUI inside #advancedControlsHost (inside col 02 shell); no separate flyout. */
    function mountAdvancedGuiToFsSidebar() {
        if (!portalIsFs()) return;
        var host = document.getElementById('advancedControlsHost');
        var sh = getAdvShell();
        if (!host || !sh) return;
        if (sh.parentNode !== host) {
            host.appendChild(sh);
        }
        resetDatGuiShellForFlyout(sh);
    }

    /** Remount a portal ctrl shell into its fullscreen flyout (after reset from drag). */
    function mountCtrlPanelToFsSidebar(hostId) {
        if (!portalIsFs()) return;
        var aside =
            hostId === 'pmFrequencyControlCol'
                ? asideFreq
                : hostId === 'pmAudioEngineCol'
                    ? asideAudio
                    : null;
        if (!aside) return;
        var sh = getShell(hostId);
        if (!sh) return;
        aside.appendChild(sh);
        resetShellLayoutForEmbed(sh);
    }

    function restoreAdvToHost() {
        var host = document.getElementById('advancedControlsHost');
        var sh = getAdvShell();
        if (host && sh) {
            host.appendChild(sh);
            resetDatGuiShellForFlyout(sh);
        }
    }

    function flyoutIsPinned(slot) {
        return slot.getAttribute('data-pm-flyout-pinned') === '1';
    }

    function flyoutSetPinned(slot, btn, v) {
        slot.setAttribute('data-pm-flyout-pinned', v ? '1' : '0');
        btn.setAttribute('data-pm-pinned', v ? 'true' : 'false');
    }

    function wireFlyoutSlot(slot, aside, btn, closeBtn) {
        var hideTimer = null;
        var peek = false;

        function syncOpenClass() {
            var pinned = flyoutIsPinned(slot);
            var open = pinned || peek;
            slot.classList.toggle('visual-fs-slot--open', open);
            slot.classList.toggle('visual-fs-slot--pinned', pinned);
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        function setPeek(v) {
            peek = !!v;
            syncOpenClass();
        }

        function cancelHide() {
            if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
            }
        }

        function scheduleHide() {
            if (flyoutIsPinned(slot)) return;
            cancelHide();
            hideTimer = window.setTimeout(function () {
                setPeek(false);
                hideTimer = null;
            }, 240);
        }

        btn.addEventListener('mouseenter', function () {
            cancelHide();
            setPeek(true);
        });

        aside.addEventListener('mouseenter', function () {
            cancelHide();
            setPeek(true);
        });

        btn.addEventListener('mouseleave', function (e) {
            var to = e.relatedTarget;
            if (containsNode(slot, to) || containsNode(aside, to)) return;
            scheduleHide();
        });

        aside.addEventListener('mouseleave', function (e) {
            var to = e.relatedTarget;
            if (containsNode(slot, to) || containsNode(aside, to)) return;
            scheduleHide();
        });

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var next = !flyoutIsPinned(slot);
            flyoutSetPinned(slot, btn, next);
            cancelHide();
            if (next) {
                setPeek(true);
            } else {
                setPeek(slot.matches(':hover') || aside.matches(':hover'));
            }
        });

        function closeFlyoutPanel(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            flyoutSetPinned(slot, btn, false);
            cancelHide();
            setPeek(false);
            syncOpenClass();
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeFlyoutPanel);
            closeBtn.addEventListener('mousedown', function (e) {
                e.stopPropagation();
            });
        }

        slot.__pmResetFlyout = function () {
            peek = false;
            cancelHide();
            syncOpenClass();
        };
    }

    function resetAllFlyoutSlots() {
        if (!dockEl) return;
        dockEl.querySelectorAll('.visual-fs-slot').forEach(function (slot) {
            slot.classList.remove('visual-fs-slot--open', 'visual-fs-slot--pinned');
            slot.removeAttribute('data-pm-flyout-pinned');
            if (typeof slot.__pmResetFlyout === 'function') slot.__pmResetFlyout();
        });
        dockEl.querySelectorAll('button.visual-fs-icon').forEach(function (b) {
            b.setAttribute('aria-expanded', 'false');
            b.setAttribute('data-pm-pinned', 'false');
        });
    }

    function anyFsFlyoutOpen() {
        if (!dockEl) return false;
        return dockEl.querySelector('.visual-fs-slot--open') !== null;
    }

    function buildDock(portal) {
        if (dockBuilt) return;
        dockBuilt = true;
        dockEl = document.createElement('div');
        dockEl.className = 'visual-fs-dock';
        dockEl.setAttribute('aria-label', 'Fullscreen controls sidebar');

        var rail = document.createElement('div');
        rail.className = 'visual-fs-rail';

        function makeSlot(hostId, label, iconSvg) {
            var slot = document.createElement('div');
            slot.className = 'visual-fs-slot';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'visual-fs-icon';
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label + ' — hover to preview, click rail icon to pin; use × on panel to close');
            btn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('data-pm-pinned', 'false');
            btn.innerHTML = iconSvg;
            var aside = document.createElement('aside');
            aside.className = 'visual-fs-panel';
            aside.setAttribute('aria-label', label);
            var head = document.createElement('div');
            head.className = 'visual-fs-panel-head';
            var titleEl = document.createElement('span');
            titleEl.className = 'visual-fs-panel-title';
            titleEl.textContent = label;
            var closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'visual-fs-close';
            closeBtn.setAttribute('aria-label', 'Close ' + label);
            closeBtn.title = 'Close panel';
            closeBtn.innerHTML = '\u00d7';
            head.appendChild(titleEl);
            head.appendChild(closeBtn);
            aside.appendChild(head);
            slot.appendChild(btn);
            slot.appendChild(aside);
            return { slot: slot, aside: aside, btn: btn, closeBtn: closeBtn };
        }

        var iconSound = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02A4.5 4.5 0 0 0 21 12a4.5 4.5 0 0 0-2-3.74v2.09c.62.63 1 1.49 1 2.65zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/></svg>';
        var iconAdv = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 17h2v-2H3v2zm0-10h2V7H3v2zm4 14h2v-4H7v4zM7 5v4h2V5H7zm4 14h10v-2H11v2zm0-14v2h10V5H11z"/></svg>';

        var f = makeSlot('pmFrequencyControlCol', 'Sound & playback', iconSound);
        asideFreq = f.aside;
        var a = makeSlot('pmAudioEngineCol', 'Advanced visuals', iconAdv);
        asideAudio = a.aside;

        wireFlyoutSlot(f.slot, f.aside, f.btn, f.closeBtn);
        wireFlyoutSlot(a.slot, a.aside, a.btn, a.closeBtn);

        rail.appendChild(f.slot);
        rail.appendChild(a.slot);
        dockEl.appendChild(rail);
        portal.appendChild(dockEl);
    }

    function portalIsFs() {
        var pc = document.getElementById('portal-container');
        if (!pc) return false;
        return document.fullscreenElement === pc
            || document.webkitFullscreenElement === pc
            || pc.classList.contains('visual-fs-css-target');
    }

    function onFsLayoutEnter() {
        buildDock(document.getElementById('portal-container'));
        resetAllFlyoutSlots();
        moveShellInto(asideFreq, 'pmFrequencyControlCol');
        moveShellInto(asideAudio, 'pmAudioEngineCol');
        mountAdvancedGuiToFsSidebar();
        window.setTimeout(function () {
            window.dispatchEvent(new Event('resize'));
        }, 80);
    }

    function onFsLayoutExit() {
        resetAllFlyoutSlots();
        restoreShellsToGrid();
        restoreAdvToHost();
        window.setTimeout(function () {
            window.dispatchEvent(new Event('resize'));
        }, 80);
    }

    function enterFs() {
        var pc = document.getElementById('portal-container');
        if (!pc) return;
        buildDock(pc);

        if (pc.requestFullscreen) {
            pc.requestFullscreen().catch(function () {
                tryCssFs(pc);
            });
            return;
        }
        if (pc.webkitRequestFullscreen) {
            try {
                pc.webkitRequestFullscreen();
            } catch (e) {
                tryCssFs(pc);
            }
            return;
        }
        tryCssFs(pc);
    }

    function tryCssFs(pc) {
        pc.classList.add('visual-fs-css-target');
        document.body.classList.add('visual-fs-css-on');
        onFsLayoutEnter();
        if (btnToggle) btnToggle.setAttribute('aria-pressed', 'true');
        window.setTimeout(function () {
            if (typeof global.__cymaticsResumeWebAudio === 'function') {
                global.__cymaticsResumeWebAudio();
            }
        }, 0);
    }

    function exitFs() {
        var pc = document.getElementById('portal-container');
        if (!pc) return;

        onFsLayoutExit();

        if (document.fullscreenElement === pc && document.exitFullscreen) {
            document.exitFullscreen().catch(function () {});
        } else if (document.webkitFullscreenElement === pc && document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }

        pc.classList.remove('visual-fs-css-target');
        document.body.classList.remove('visual-fs-css-on');
        if (btnToggle) btnToggle.setAttribute('aria-pressed', 'false');
    }

    function toggleFs() {
        if (portalIsFs()) exitFs();
        else enterFs();
    }

    function onFullscreenChange() {
        var pc = document.getElementById('portal-container');
        if (!pc) return;
        var apiIn = document.fullscreenElement === pc || document.webkitFullscreenElement === pc;
        var cssIn = pc.classList.contains('visual-fs-css-target');

        if (apiIn || cssIn) {
            buildDock(pc);
            onFsLayoutEnter();
            window.setTimeout(function () {
                if (typeof global.__cymaticsResumeWebAudio === 'function') {
                    global.__cymaticsResumeWebAudio();
                }
            }, 0);
        } else {
            onFsLayoutExit();
        }
        if (btnToggle) {
            btnToggle.setAttribute('aria-pressed', apiIn || cssIn ? 'true' : 'false');
        }
        window.dispatchEvent(new Event('resize'));
    }

    function initVisualFullscreenUI() {
        injectStyles();
        global.__pmFsMountAdvancedGui = mountAdvancedGuiToFsSidebar;
        global.__pmFsMountCtrlPanelToSidebar = mountCtrlPanelToFsSidebar;
        var pc = document.getElementById('portal-container');
        btnToggle = document.getElementById('btnVisualFullscreen');
        if (!pc || !btnToggle) return;

        btnToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleFs();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!portalIsFs()) return;
            if (anyFsFlyoutOpen()) {
                e.preventDefault();
                resetAllFlyoutSlots();
                return;
            }
            exitFs();
        });

        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);

        global.__pmVisualFullscreenToggle = toggleFs;
        global.__pmVisualFullscreenExit = exitFs;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVisualFullscreenUI);
    } else {
        initVisualFullscreenUI();
    }
})(typeof window !== 'undefined' ? window : this);
