/**
 * Wraps a dat.GUI instance in a draggable shell with a minimize button.
 * Call attachMovableDatGui(gui, options) after building all folders/controllers.
 *
 * options: { title, parent, initialTop, initialLeft, initialRight, zIndex }
 * If parent is an HTMLElement, the shell starts embedded in layout; expanding the panel (non-narrow)
 * or dragging the header promotes it to position:fixed at the same on-screen position so it does not scroll away.
 * Use Reset position to dock back into the layout. Without parent, it is fixed to the viewport.
 * startMinimized: false to expand body on load; default is collapsed (header + title bar only).
 * gui.__pmDatGuiToggleVisibility() — hide/show entire shell (for H hotkey)
 */
(function (global) {
    var styled = false;

    function injectStyles() {
        if (styled) return;
        styled = true;
        var s = document.createElement('style');
        s.id = 'pm-dat-gui-panel-styles';
        s.textContent = [
            '.pm-dat-gui-shell{font-family:Lucida Grande,sans-serif;font-size:11px;display:flex;flex-direction:column;',
            'box-shadow:0 4px 24px rgba(0,0,0,0.4);border-radius:4px;overflow:hidden;background:#1a1a1a;',
            'max-height:min(92vh,calc(100vh - 16px))}',
            '.pm-dat-gui-header{display:flex;align-items:center;gap:8px;padding:8px 10px;flex-shrink:0;',
            'background:linear-gradient(180deg,#2e2e2e,#232323);border-bottom:1px solid #0d0d0d;',
            'color:#e2e2e2;cursor:grab;user-select:none;-webkit-user-select:none}',
            '.pm-dat-gui-shell.pm-dat-gui-dragging .pm-dat-gui-header{cursor:grabbing}',
            '.pm-dat-gui-drag-hint{opacity:0.5;font-size:12px;line-height:1}',
            '.pm-dat-gui-title{flex:1;font-weight:600;letter-spacing:0.02em}',
            '.pm-dat-gui-body{background:#1a1a1a;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;',
            '-webkit-overflow-scrolling:touch}',
            '.pm-dat-gui-body .dg{position:relative!important;margin-right:0!important}',
            '.pm-dat-gui-min{flex-shrink:0;min-width:30px;height:26px;padding:0 8px;border:1px solid #555;',
            'border-radius:3px;background:#3a3a3a;color:#f0f0f0;cursor:pointer;font-size:15px;line-height:1}',
            '.pm-dat-gui-min:hover{background:#4a4a4a}',
            '.pm-dat-gui-reset-pos{flex-shrink:0;min-width:30px;height:26px;padding:0 8px;border:1px solid #555;',
            'border-radius:3px;background:#3a3a3a;color:#f0f0f0;cursor:pointer;font-size:15px;line-height:1}',
            '.pm-dat-gui-reset-pos:hover{background:#4a4a4a}',
            '.pm-dat-gui-fs-close{flex-shrink:0;min-width:30px;height:26px;padding:0 8px;border:1px solid #555;',
            'border-radius:3px;background:#3a3a3a;color:#f0f0f0;cursor:pointer;font-size:17px;line-height:1}',
            '.pm-dat-gui-fs-close:hover{background:rgba(180,56,56,0.45);border-color:#a85555;color:#fff}',
            '.pm-dat-gui-shell--embedded{max-height:min(52vh,440px)}',
            '@media (max-width:768px){',
            '.pm-dat-gui-header{cursor:default;-webkit-user-select:auto;user-select:auto;touch-action:manipulation}',
            '.pm-dat-gui-drag-hint{display:none!important}}'
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

    function attachMovableDatGui(gui, options) {
        if (!gui || !gui.domElement) return null;
        injectStyles();
        options = options || {};
        var title = options.title || 'Controls';
        var z = options.zIndex != null ? options.zIndex : 450;
        var embedParent = options.parent;
        var isEmbedded = !!(embedParent && embedParent.nodeType === 1);

        var el = gui.domElement;
        el.style.position = 'relative';
        el.style.top = '0';
        el.style.left = '0';
        el.style.right = 'auto';
        el.style.margin = '0';
        if (el.parentNode) el.parentNode.removeChild(el);

        var shell = document.createElement('div');
        shell.className = 'pm-dat-gui-shell' + (isEmbedded ? ' pm-dat-gui-shell--embedded' : '');
        var header = document.createElement('div');
        header.className = 'pm-dat-gui-header';
        var dragHint = document.createElement('span');
        dragHint.className = 'pm-dat-gui-drag-hint';
        dragHint.textContent = '⋮⋮';
        dragHint.title = 'Drag to move';
        var titleEl = document.createElement('span');
        titleEl.className = 'pm-dat-gui-title';
        titleEl.textContent = title;
        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'pm-dat-gui-reset-pos';
        resetBtn.setAttribute('aria-label', 'Reset panel position');
        resetBtn.title = 'Reset to default position';
        resetBtn.innerHTML = '\u21ba';
        var fsCloseBtn = document.createElement('button');
        fsCloseBtn.type = 'button';
        fsCloseBtn.className = 'pm-dat-gui-fs-close';
        fsCloseBtn.setAttribute('aria-label', 'Close flyout panel');
        fsCloseBtn.title = 'Close panel';
        fsCloseBtn.innerHTML = '\u00d7';
        var minBtn = document.createElement('button');
        minBtn.type = 'button';
        minBtn.className = 'pm-dat-gui-min';
        minBtn.setAttribute('aria-label', 'Minimize panel');
        minBtn.textContent = '\u2212';
        minBtn.title = 'Minimize / expand';

        header.appendChild(dragHint);
        header.appendChild(titleEl);
        header.appendChild(resetBtn);
        header.appendChild(fsCloseBtn);
        header.appendChild(minBtn);

        var body = document.createElement('div');
        body.className = 'pm-dat-gui-body';
        body.appendChild(el);
        var dgClose = gui.__closeButton || (el.querySelector && el.querySelector('.close-button'));
        if (dgClose) dgClose.style.display = 'none';

        shell.appendChild(header);
        shell.appendChild(body);

        var dockHomeId = embedParent && embedParent.id ? embedParent.id : 'advancedControlsHost';
        shell.setAttribute('data-pm-dock-home', dockHomeId);

        if (isEmbedded) {
            embedParent.appendChild(shell);
            shell.style.position = 'relative';
            shell.style.left = '';
            shell.style.right = '';
            shell.style.top = '';
            shell.style.width = '100%';
            shell.style.maxWidth = '100%';
            shell.style.boxSizing = 'border-box';
            shell.style.zIndex = options.zIndex != null ? String(options.zIndex) : '';
        } else {
            document.body.appendChild(shell);
            shell.style.position = 'fixed';
            shell.style.zIndex = String(z);

            var topPx = options.initialTop != null
                ? (typeof options.initialTop === 'number' ? options.initialTop + 'px' : String(options.initialTop))
                : '12px';
            if (options.initialLeft != null) {
                shell.style.left = typeof options.initialLeft === 'number'
                    ? options.initialLeft + 'px'
                    : String(options.initialLeft);
                shell.style.top = topPx;
                shell.style.right = 'auto';
            } else if (options.initialRight != null) {
                shell.style.right = typeof options.initialRight === 'number'
                    ? options.initialRight + 'px'
                    : String(options.initialRight);
                shell.style.top = topPx;
                shell.style.left = 'auto';
            } else {
                shell.style.left = '12px';
                shell.style.top = topPx;
                shell.style.right = 'auto';
            }
        }

        var minimized = options.startMinimized !== false;
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
            if (!minimized && embedParent && shell.parentNode === embedParent && !isNarrowPortalLayout()) {
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

        /** Keep floated panel inside #portal-container while visual fullscreen is active (API or CSS fallback). */
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
            shell.classList.remove('pm-dat-gui-shell--embedded');
            shell.style.position = 'fixed';
            shell.style.left = Math.round(r.left) + 'px';
            shell.style.top = Math.round(r.top) + 'px';
            shell.style.right = 'auto';
            shell.style.width = Math.round(r.width) + 'px';
            shell.style.maxWidth = 'min(92vw, 520px)';
            shell.style.boxSizing = 'border-box';
            shell.style.zIndex = String(z);
            clampFloatingShellToViewport();
        }

        function resetShellToDefaultPosition(ev) {
            if (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            var home = document.getElementById(dockHomeId);
            if (!home) return;
            home.appendChild(shell);
            shell.classList.add('pm-dat-gui-shell--embedded');
            shell.style.position = 'relative';
            shell.style.left = '';
            shell.style.top = '';
            shell.style.right = '';
            shell.style.width = '100%';
            shell.style.maxWidth = '100%';
            shell.style.boxSizing = 'border-box';
            shell.style.zIndex = options.zIndex != null ? String(options.zIndex) : '';
            if (typeof global.__pmFsMountAdvancedGui === 'function') {
                global.__pmFsMountAdvancedGui();
            }
            if (typeof global.__pmFsMountWormholeGui === 'function') {
                global.__pmFsMountWormholeGui();
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
            shell.classList.remove('pm-dat-gui-dragging');
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
            shell.classList.add('pm-dat-gui-dragging');
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

        gui.__pmDatGuiShell = shell;
        gui.__pmDatGuiToggleVisibility = function () {
            shell.style.display = shell.style.display === 'none' ? '' : 'none';
        };
        gui.__pmDatGuiResetPosition = resetShellToDefaultPosition;

        return shell;
    }

    global.attachMovableDatGui = attachMovableDatGui;
})(typeof window !== 'undefined' ? window : this);
