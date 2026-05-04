/**
 * Draggable / minimisable shells for portal control columns (Sound & playback, Advanced visuals).
 * Starts embedded in the grid; expanding the panel (non-narrow) or first header drag promotes to position:fixed
 * at the same rect so controls do not scroll away; reset docks back (disabled ≤768px).
 * options.startMinimized — if true, body hidden until user expands (optional per column).
 */
(function (global) {
    var styled = false;

    function injectStyles() {
        if (styled) return;
        styled = true;
        var s = document.createElement('style');
        s.id = 'pm-portal-ctrl-panel-styles';
        s.textContent = [
            '.ctrl-col.pm-portal-ctrl-host{padding:0;min-height:0;display:flex;flex-direction:column}',
            '.pm-portal-ctrl-shell{display:flex;flex-direction:column;min-height:0;width:100%;box-sizing:border-box;',
            'max-height:min(78vh,920px);border-radius:8px;border:1px solid rgba(255,248,224,0.18);',
            'background:rgba(6,8,16,0.78);box-shadow:0 4px 28px rgba(0,0,0,0.35);overflow:hidden}',
            '.pm-portal-ctrl-shell--embedded{max-height:min(72vh,800px)}',
            '.pm-portal-ctrl-head{display:flex;align-items:center;gap:8px;flex-shrink:0;padding:10px 12px;',
            'background:linear-gradient(180deg,rgba(255,248,224,0.14),rgba(255,248,224,0.04));',
            'border-bottom:1px solid rgba(255,248,224,0.16);cursor:grab;user-select:none;-webkit-user-select:none}',
            '.pm-portal-ctrl-shell.pm-portal-ctrl-dragging .pm-portal-ctrl-head{cursor:grabbing}',
            '.pm-portal-ctrl-hint{opacity:0.45;font-size:12px;line-height:1;color:var(--cream)}',
            '.pm-portal-ctrl-title{flex:1;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;',
            'color:var(--cream)}',
            '.pm-portal-ctrl-min{flex-shrink:0;min-width:32px;height:26px;padding:0 8px;',
            'border:1px solid rgba(255,248,224,0.35);border-radius:6px;background:rgba(255,248,224,0.08);',
            'color:var(--cream);cursor:pointer;font-size:16px;line-height:1}',
            '.pm-portal-ctrl-min:hover{background:rgba(255,248,224,0.14)}',
            '.pm-portal-ctrl-reset{flex-shrink:0;min-width:30px;height:26px;padding:0 8px;',
            'border:1px solid rgba(255,248,224,0.35);border-radius:6px;background:rgba(255,248,224,0.08);',
            'color:var(--cream);cursor:pointer;font-size:15px;line-height:1}',
            '.pm-portal-ctrl-reset:hover{background:rgba(255,248,224,0.14)}',
            '.pm-portal-ctrl-fs-close{flex-shrink:0;min-width:30px;height:26px;padding:0 8px;',
            'border:1px solid rgba(255,248,224,0.35);border-radius:6px;background:rgba(255,248,224,0.08);',
            'color:var(--cream);cursor:pointer;font-size:17px;line-height:1}',
            '.pm-portal-ctrl-fs-close:hover{background:rgba(255,80,80,0.22);border-color:rgba(255,120,120,0.55);color:#fff}',
            '.pm-portal-ctrl-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:16px 18px;',
            '-webkit-overflow-scrolling:touch}',
            '@media (max-width:768px){',
            '.pm-portal-ctrl-head{cursor:default;-webkit-user-select:auto;user-select:auto;touch-action:manipulation}',
            '.pm-portal-ctrl-hint{display:none!important}}'
        ].join('');
        document.head.appendChild(s);
    }

    function isNarrowPortalLayout() {
        try {
            return window.matchMedia('(max-width: 768px)').matches;
        } catch (e) {
            return (window.innerWidth || 0) <= 768;
        }
    }

    function attachMovablePortalCtrlPanel(hostEl, options) {
        if (!hostEl || hostEl.nodeType !== 1) return null;
        injectStyles();
        options = options || {};
        var z = options.zIndex != null ? options.zIndex : 460;
        var startMinimized = !!options.startMinimized;

        var h3 = hostEl.querySelector(':scope > h3');
        var title = options.title || 'Panel';
        if (h3) {
            title = String(h3.textContent || '').replace(/\s+/g, ' ').trim() || title;
            hostEl.removeChild(h3);
        }

        hostEl.classList.add('pm-portal-ctrl-host');

        var shell = document.createElement('div');
        shell.className = 'pm-portal-ctrl-shell pm-portal-ctrl-shell--embedded';

        var header = document.createElement('div');
        header.className = 'pm-portal-ctrl-head';
        var dragHint = document.createElement('span');
        dragHint.className = 'pm-portal-ctrl-hint';
        dragHint.textContent = '\u22ee\u22ee';
        dragHint.title = 'Drag to move';
        var titleEl = document.createElement('span');
        titleEl.className = 'pm-portal-ctrl-title';
        titleEl.textContent = title;

        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'pm-portal-ctrl-reset';
        resetBtn.setAttribute('aria-label', 'Reset panel position');
        resetBtn.title = 'Reset to default position';
        resetBtn.innerHTML = '\u21ba';

        var fsCloseBtn = document.createElement('button');
        fsCloseBtn.type = 'button';
        fsCloseBtn.className = 'pm-portal-ctrl-fs-close';
        fsCloseBtn.setAttribute('aria-label', 'Close flyout panel');
        fsCloseBtn.title = 'Close panel';
        fsCloseBtn.innerHTML = '\u00d7';

        var minBtn = document.createElement('button');
        minBtn.type = 'button';
        minBtn.className = 'pm-portal-ctrl-min';
        minBtn.setAttribute('aria-label', 'Minimize panel');
        minBtn.textContent = '\u2212';
        minBtn.title = 'Minimize / expand';

        header.appendChild(dragHint);
        header.appendChild(titleEl);
        header.appendChild(resetBtn);
        header.appendChild(fsCloseBtn);
        header.appendChild(minBtn);

        var body = document.createElement('div');
        body.className = 'pm-portal-ctrl-body';
        while (hostEl.firstChild) {
            body.appendChild(hostEl.firstChild);
        }

        shell.appendChild(header);
        shell.appendChild(body);
        hostEl.appendChild(shell);

        if (hostEl.id) shell.setAttribute('data-pm-ctrl-host', hostEl.id);

        shell.style.position = 'relative';
        shell.style.width = '100%';
        shell.style.boxSizing = 'border-box';

        var minimized = startMinimized;
        if (minimized) {
            body.style.display = 'none';
            minBtn.textContent = '+';
            minBtn.setAttribute('aria-label', 'Expand panel');
            minBtn.title = 'Expand';
        }
        minBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            ev.preventDefault();
            minimized = !minimized;
            body.style.display = minimized ? 'none' : '';
            minBtn.textContent = minimized ? '+' : '\u2212';
            minBtn.setAttribute('aria-label', minimized ? 'Expand panel' : 'Minimize panel');
            minBtn.title = minimized ? 'Expand' : 'Minimize / expand';
            if (!minimized && shell.parentNode === hostEl && !isNarrowPortalLayout()) {
                promoteShellToFixed();
            }
        });

        resetBtn.addEventListener('click', resetShellToDefaultPosition);
        resetBtn.addEventListener('mousedown', function (e) {
            e.stopPropagation();
        });

        fsCloseBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (typeof global.__pmFsCloseFlyoutContaining === 'function') {
                global.__pmFsCloseFlyoutContaining(shell);
            }
        });
        fsCloseBtn.addEventListener('mousedown', function (e) {
            e.stopPropagation();
        });

        var dragging = false;
        var startX;
        var startY;
        var origLeft;
        var origTop;

        function getDragFloatParent() {
            var pc = document.getElementById('portal-container');
            if (!pc) return document.body;
            if (document.fullscreenElement === pc || document.webkitFullscreenElement === pc) return pc;
            if (pc.classList.contains('visual-fs-css-target')) return pc;
            return document.body;
        }

        function clampFloatingShellToViewport() {
            if (shell.style.position !== 'fixed') return;
            var r = shell.getBoundingClientRect();
            var vw = window.innerWidth || document.documentElement.clientWidth || 0;
            var vh = window.innerHeight || document.documentElement.clientHeight || 0;
            var m = 8;
            var w = r.width || 280;
            var h = Math.max(r.height || 0, 80);
            var left = parseFloat(shell.style.left);
            var top = parseFloat(shell.style.top);
            if (isNaN(left)) left = r.left;
            if (isNaN(top)) top = r.top;
            var maxLeft = Math.max(m, vw - w - m);
            left = Math.min(Math.max(left, m), maxLeft);
            var visibleH = Math.min(h, Math.max(vh - 2 * m, m));
            var maxTop = Math.max(m, vh - m - visibleH);
            top = Math.min(Math.max(top, m), maxTop);
            shell.style.left = Math.round(left) + 'px';
            shell.style.top = Math.round(top) + 'px';
        }

        function promoteShellToFixed() {
            var floatParent = getDragFloatParent();
            if (shell.parentNode === floatParent && shell.style.position === 'fixed') return;
            var r = shell.getBoundingClientRect();
            floatParent.appendChild(shell);
            shell.classList.remove('pm-portal-ctrl-shell--embedded');
            shell.style.position = 'fixed';
            shell.style.left = Math.round(r.left) + 'px';
            shell.style.top = Math.round(r.top) + 'px';
            shell.style.right = 'auto';
            shell.style.width = Math.round(r.width) + 'px';
            shell.style.maxWidth = '';
            shell.style.boxSizing = 'border-box';
            shell.style.zIndex = String(z);
            clampFloatingShellToViewport();
        }

        function resetShellToDefaultPosition(ev) {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            hostEl.appendChild(shell);
            shell.classList.add('pm-portal-ctrl-shell--embedded');
            shell.style.position = 'relative';
            shell.style.left = '';
            shell.style.top = '';
            shell.style.right = '';
            shell.style.width = '100%';
            shell.style.maxWidth = '';
            shell.style.boxSizing = 'border-box';
            shell.style.zIndex = '';
            if (typeof global.__pmFsMountCtrlPanelToSidebar === 'function') {
                global.__pmFsMountCtrlPanelToSidebar(hostEl.id);
            }
        }

        function toLeftTop() {
            var r = shell.getBoundingClientRect();
            shell.style.left = Math.round(r.left) + 'px';
            shell.style.top = Math.round(r.top) + 'px';
            shell.style.right = 'auto';
        }

        function onMove(e) {
            if (!dragging) return;
            var dx = e.clientX - startX;
            var dy = e.clientY - startY;
            shell.style.left = Math.round(origLeft + dx) + 'px';
            shell.style.top = Math.round(origTop + dy) + 'px';
        }

        function onUp() {
            if (!dragging) return;
            dragging = false;
            shell.classList.remove('pm-portal-ctrl-dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            clampFloatingShellToViewport();
        }

        function snapIfNarrowLayout() {
            if (!isNarrowPortalLayout()) return;
            if (shell.style.position === 'fixed') {
                resetShellToDefaultPosition();
            }
        }
        window.addEventListener('resize', snapIfNarrowLayout);
        window.addEventListener('orientationchange', snapIfNarrowLayout);

        header.addEventListener('mousedown', function (e) {
            if (isNarrowPortalLayout()) return;
            if (e.target === minBtn || minBtn.contains(e.target)) return;
            if (e.target === resetBtn || resetBtn.contains(e.target)) return;
            if (e.target === fsCloseBtn || fsCloseBtn.contains(e.target)) return;
            promoteShellToFixed();
            dragging = true;
            shell.classList.add('pm-portal-ctrl-dragging');
            toLeftTop();
            var r = shell.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            origLeft = r.left;
            origTop = r.top;
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            e.preventDefault();
        });

        return shell;
    }

    function initPortalCtrlPanels() {
        var freq = document.getElementById('pmFrequencyControlCol');
        var eng = document.getElementById('pmAudioEngineCol');
        if (freq) attachMovablePortalCtrlPanel(freq, { zIndex: 460 });
        if (eng) attachMovablePortalCtrlPanel(eng, { zIndex: 461 });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPortalCtrlPanels);
    } else {
        initPortalCtrlPanels();
    }

    global.attachMovablePortalCtrlPanel = attachMovablePortalCtrlPanel;
})(typeof window !== 'undefined' ? window : this);
