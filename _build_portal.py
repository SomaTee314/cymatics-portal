# -*- coding: utf-8 -*-
"""Merge Cymatics source IIFE into portal index.html."""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import _landing_assets
import wormhole_iife_patch

_SEO_TITLE = "Cymatics Portal — Sound Made Visible"
_SEO_META_DESCRIPTION = (
    "Explore Chladni standing-wave patterns, Solfeggio frequencies, and sacred geometry "
    "in real-time 3D. Built with Three.js and Web Audio API."
)
_SEO_TWITTER_DESCRIPTION = (
    "Real-time Chladni patterns, Solfeggio frequencies & sacred geometry in 3D."
)
_SEO_OG_IMAGE_ALT = "Cymatics Portal — fractal geometry with Chladni wave patterns"
_SEO_KEYWORDS = (
    "cymatics, Chladni figures, particle visualiser, Web Audio API, Three.js, healing frequencies, "
    "528 Hz, solfeggio, sacred geometry, Nāda Brahma, SomaTea, Particle Madness, sound visualisation"
)


def _site_origin() -> str:
    """Canonical origin for meta tags, JSON-LD, and sitemap (override with CYMATICS_SITE_URL)."""
    return (os.environ.get("CYMATICS_SITE_URL") or "https://cymatics-portal.vercel.app").rstrip("/")


def _json_ld_script_blobs(origin: str) -> str:
    """Multiple safe JSON-LD script tags for <head>."""
    o = origin.rstrip("/")
    desc = _SEO_META_DESCRIPTION
    blobs: list[dict] = [
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Cymatics Portal",
            "alternateName": ["Nocturnal Labs x SomaTea"],
            "url": f"{o}/",
            "logo": f"{o}/favicon-32.png",
            "description": desc,
        },
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Cymatics Portal",
            "url": f"{o}/",
            "description": desc,
            "publisher": {"@type": "Organization", "name": "Cymatics Portal"},
        },
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": _SEO_TITLE,
            "description": desc,
            "url": f"{o}/",
            "isPartOf": {"@type": "WebSite", "name": "Cymatics Portal", "url": f"{o}/"},
        },
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Cymatics Portal",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Web Browser",
            "description": desc,
            "url": f"{o}/",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "What is Cymatics Portal?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": (
                            "Cymatics Portal is a browser-based interactive experience that visualises "
                            "Chladni-style standing waves with thousands of 3D particles. It pairs a cymatics "
                            "engine with Web Audio so you can explore sound-driven patterns and frequencies."
                        ),
                    },
                },
                {
                    "@type": "Question",
                    "name": "Do I need to install anything to use Cymatics Portal?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": (
                            "No installation is required. Open the site in a modern desktop or mobile browser. "
                            "Optional microphone access may be requested if you use live audio-reactive modes."
                        ),
                    },
                },
                {
                    "@type": "Question",
                    "name": "How does audio interact with the visual?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": (
                            "Use the sound and playback controls to drive or analyse audio. Playback "
                            "and device access follow browser rules — you may need to tap or click to start "
                            "audio after loading the page."
                        ),
                    },
                },
            ],
        },
    ]
    out: list[str] = []
    for blob in blobs:
        raw = json.dumps(blob, ensure_ascii=False).replace("<", "\\u003c")
        out.append(f'  <script type="application/ld+json">{raw}</script>')
    return "\n".join(out)


def write_seo_sidecar_files(project_root: Path, origin: str) -> None:
    """Write robots.txt, llms.txt, sitemap.xml at project root (static Vercel serves /file from root, not Next.js public/)."""
    o = origin.rstrip("/")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    robots = f"""# Cymatics Portal — crawler policy (see SEO-AGENT.md)
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: *
Allow: /

Sitemap: {o}/sitemap.xml
"""
    (project_root / "robots.txt").write_text(robots, encoding="utf-8")

    llms = f"""# Cymatics Portal

> Interactive 3D cymatics and Chladni-style particle visualisation in the browser — Web Audio, healing frequencies, Nocturnal Labs x SomaTea.

## About

Cymatics Portal merges a retro-futuristic portal interface with a real-time particle cymatics engine. Visitors can explore standing-wave physics, frequency controls, and optional audio-reactive visuals without installing software.

## Key pages

- [Home / app]({o}/): Single-page experience — landing, guide, and main cymatics visualiser.

## Capabilities

- Real-time 3D particle field driven by cymatics / Chladni-style physics
- Web Audio integration (playback and analysis; browser permission prompts apply)
- Frequency and advanced visual controls
- Fullscreen visual mode for focused sessions

## Contact & brand

- Project framing: Nocturnal Labs x SomaTea — *Nāda Brahma* (sound as primal vibration)
- Deployed example: {o}/
"""
    (project_root / "llms.txt").write_text(llms, encoding="utf-8")

    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>{o}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>{o}/og-image.png</image:loc>
      <image:title>Cymatics Portal</image:title>
    </image:image>
  </url>
</urlset>
"""
    (project_root / "sitemap.xml").write_text(sitemap, encoding="utf-8")

root = Path(__file__).resolve().parent
Particle = root / "Particle"
if not (Particle / "experiments" / "cymatics" / "index.html").exists():
    Particle = root / "_extract_particle" / "Particle"
cym = Particle / "experiments" / "cymatics" / "index.html"
datgui = Particle / "js" / "dat-gui-panel.js"
portal_ctrl_panels = Particle / "js" / "portal-ctrl-panels.js"
visual_fullscreen_ui = Particle / "js" / "visual-fullscreen-ui.js"
if not cym.is_file() or not datgui.is_file() or not portal_ctrl_panels.is_file() or not visual_fullscreen_ui.is_file():
    raise SystemExit(
        "Missing cymatics sources. Extract Particle Source.zip to CymaticsPortal/Particle/ "
        "or to CymaticsPortal/_extract_particle/Particle/"
    )

_landing_assets.main()

overlay_path = root / "landing" / "overlay.html"
if not overlay_path.is_file():
    raise SystemExit(f"Missing landing overlay: {overlay_path}")
landing_overlay_html = overlay_path.read_text(encoding="utf-8").strip() + "\n"

text = cym.read_text(encoding="utf-8")
m = re.search(
    r"<script>\s*(\(function\s*\(\)\s*\{[\s\S]*?\}\)\(\);)\s*</script>", text
)
if not m:
    raise SystemExit("IIFE not found")
iife = m.group(1)

# Remove floating panel: cymShell through setupCymDrag IIFE closing
pat = (
    r"    var cymShell = document\.getElementById\('cym-shell'\);"
    r"[\s\S]*?"
    r"\}\)\(\);\n\n    function syncFreqFromDial"
)
iife2, n = re.subn(pat, "    function syncFreqFromDial", iife, count=1)
if n != 1:
    raise SystemExit(f"panel remove failed: {n}")

iife2 = iife2.replace(
    "document.body.insertBefore(renderer.domElement, document.body.firstChild);",
    "var container = document.getElementById('portal-container');\n"
    "    container.insertBefore(renderer.domElement, container.firstChild);\n"
    "    renderer.domElement.style.borderRadius = 'var(--radius)';",
)

resize_old = r"""    function resize() {
        var w = window.innerWidth, h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, true);
    }
    window.addEventListener('resize', resize);
    resize();"""

resize_new = r"""    var __cpResizeRaf = null;
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
    }"""

if resize_old not in iife2:
    raise SystemExit("resize block not found")
iife2 = iife2.replace(resize_old, resize_new)

_ctx_restore_old = """                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                resize();"""
_ctx_restore_new = """                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                try {
                    __cpLastSizeW = 0;
                    __cpLastSizeH = 0;
                } catch (eRs) {}
                resize();"""
if _ctx_restore_old in iife2:
    iife2 = iife2.replace(_ctx_restore_old, _ctx_restore_new, 1)

_cam_look_old = "    camera.position.set(0, 0.08, 2.5);\n"
_cam_look_new = (
    "    camera.position.set(0, 0.08, 2.5);\n"
    "    var __cpLookTarget = new THREE.Vector3(0, 0, 0);\n"
)
if _cam_look_old in iife2:
    iife2 = iife2.replace(_cam_look_old, _cam_look_new, 1)
iife2 = iife2.replace(
    "camera.lookAt(new THREE.Vector3(0, 0, 0));",
    "camera.lookAt(__cpLookTarget);",
    1,
)

_anim_gate_old = """    function animate() {
        requestAnimationFrame(animate);
        var dt = clock.getDelta();"""
_anim_gate_new = """    function animate() {
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
        var dt = clock.getDelta();"""
if _anim_gate_old not in iife2:
    raise SystemExit("animate() landing-gate anchor not found — check cymatics IIFE")
iife2 = iife2.replace(_anim_gate_old, _anim_gate_new, 1)

attach_old = """        if (typeof attachMovableDatGui === 'function') {
            attachMovableDatGui(gui, { title: 'Cymatics (advanced)', initialRight: 12, initialTop: 12, zIndex: 100 });
        }
        window.addEventListener('keydown', function (e) {
            if (e.key === 'h' || e.key === 'H') {
                if (gui.__pmDatGuiToggleVisibility) gui.__pmDatGuiToggleVisibility();
                else gui.domElement.style.display = gui.domElement.style.display === 'none' ? '' : 'none';
            }
        });"""

attach_new = """        if (typeof attachMovableDatGui === 'function') {
            var _advHost = document.getElementById('advancedControlsHost');
            attachMovableDatGui(gui, _advHost
                ? { title: 'Advanced Visual Controls', parent: _advHost }
                : { title: 'Advanced Visual Controls', initialRight: 20, initialTop: 20, zIndex: 500 });
            if (typeof __pmFsMountAdvancedGui === 'function') {
                __pmFsMountAdvancedGui();
            }
        }"""

if attach_old not in iife2:
    raise SystemExit("attachMovableDatGui block not found")
iife2 = iife2.replace(attach_old, attach_new)

_readout_sub_anchor = "    var readout = document.getElementById('readout');\n"
_sub_bridge_path = root / "subscription_bridge.js"
if not _sub_bridge_path.is_file():
    raise SystemExit("Missing subscription_bridge.js")
_sub_bridge_body = _sub_bridge_path.read_text(encoding="utf-8").rstrip() + "\n"
_readout_sub_replacement = (
    "    var readout = document.getElementById('readout');\n" + _sub_bridge_body
)
if _readout_sub_anchor not in iife2:
    raise SystemExit("readout subscription anchor not found")
iife2 = iife2.replace(_readout_sub_anchor, _readout_sub_replacement, 1)

iife2 = iife2.replace(
    "    setupGui();\n\n    function animate()",
    "    setupGui();\n\n"
    "    window.addEventListener('keydown', function (e) {\n"
    "        if ((e.key === 'h' || e.key === 'H') && gui && gui.__pmDatGuiToggleVisibility) {\n"
    "            gui.__pmDatGuiToggleVisibility();\n"
    "        }\n"
    "    });\n\n"
    "    function animate()",
)

read_old = """        readout.textContent =
            'Particles: ' + N +
            ' · Drive Hz: ' + hz.toFixed(1) +
            ' · Peak: ' + (modeSel.value === 'track' && analyser ? smoothDomFreq.toFixed(0) : '—') +
            ' · Centroid: ' + (modeSel.value === 'track' && analyser ? smoothCentroid.toFixed(0) : '—') +
            ' · Hit: ' + (modeSel.value === 'track' && analyser ? (tr * 100).toFixed(0) + '%' : '—') +
            ' · Lobes ~' + lobes;"""

read_new = """        var fractalTag = fractalMB ? ' · Mandelbrot' : fractalJulia ? ' · Julia' : '';
        readout.textContent =
            'Particles: ' + N +
            ' · Drive Hz: ' + hz.toFixed(1) +
            ' · Lobes ~' + lobes + fractalTag;"""

if read_old not in iife2:
    raise SystemExit("readout block not found")
iife2 = iife2.replace(read_old, read_new)

mode_block = """    modeSel.addEventListener('change', function () {
        var m = modeSel.value;
        trackRow.style.display = m === 'track' ? '' : 'none';
        presetRow.style.display = m === 'preset' ? '' : 'none';
        if (m !== 'preset') selPreset.selectedIndex = 0;
        restartAudioForMode();
    });
    (function initModeRowsFromSel() {
        var m = modeSel.value;
        trackRow.style.display = m === 'track' ? '' : 'none';
        presetRow.style.display = m === 'preset' ? '' : 'none';
        if (m !== 'preset') selPreset.selectedIndex = 0;
    })();"""

# Portal: track transport row visibility + sync
mode_portal = """    modeSel.addEventListener('change', function () {
        var m = modeSel.value;
        trackRow.style.display = m === 'track' ? '' : 'none';
        if (trackTransportRow) trackTransportRow.style.display = m === 'track' ? '' : 'none';
        presetRow.style.display = m === 'preset' ? '' : 'none';
        if (m !== 'preset') selPreset.selectedIndex = 0;
        restartAudioForMode();
        syncTrackTransportUI();
        if (typeof __cpApplyModeGate === 'function') __cpApplyModeGate();
    });"""

mode_portal_init = mode_portal + """
    (function initModeRows() {
        var m = modeSel.value;
        trackRow.style.display = m === 'track' ? '' : 'none';
        if (trackTransportRow) trackTransportRow.style.display = m === 'track' ? '' : 'none';
        presetRow.style.display = m === 'preset' ? '' : 'none';
    })();"""

if mode_block not in iife2:
    raise SystemExit("modeSel listener not found")
iife2 = iife2.replace(mode_block, mode_portal_init, 1)

vol_inj = (
    "    var btnStop = document.getElementById('btnStop');\n"
    "    var volSlider = document.getElementById('volSlider');"
)
vol_new = (
    "    var btnStop = document.getElementById('btnStop');\n"
    "    var trackTransportRow = document.getElementById('trackTransportRow');\n"
    "    var btnTrackPause = document.getElementById('btnTrackPause');\n"
    "    var trackSeekSlider = document.getElementById('trackSeekSlider');\n"
    "    var trackSeekDragging = false;\n"
    "    var trackTimeLabel = document.getElementById('trackTimeLabel');\n"
    "    var volSlider = document.getElementById('volSlider');\n"
    "    var aggressionSel = document.getElementById('aggressionSel');"
)
if vol_inj not in iife2:
    raise SystemExit("btnStop/volSlider injection anchor not found")
iife2 = iife2.replace(vol_inj, vol_new, 1)

helpers_inj = (
    "    var trackObjectUrl = null;\n\n"
    "    function getVolume() {"
)
helpers_new = (
    "    var trackObjectUrl = null;\n\n"
    "    function formatTrackTime(sec) {\n"
    "        if (!isFinite(sec) || sec < 0) return '0:00';\n"
    "        var m = Math.floor(sec / 60);\n"
    "        var s = Math.floor(sec % 60);\n"
    "        return m + ':' + (s < 10 ? '0' : '') + s;\n"
    "    }\n"
    "    function updateTrackTimeLabel() {\n"
    "        if (!trackTimeLabel || !mediaEl) return;\n"
    "        var cur = mediaEl.currentTime || 0;\n"
    "        var dur = mediaEl.duration;\n"
    "        trackTimeLabel.textContent = formatTrackTime(cur) + ' / ' + "
    "(isFinite(dur) ? formatTrackTime(dur) : '—');\n"
    "        updateSeekSliderFromMedia();\n"
    "    }\n"
    "    function updateSeekSliderFromMedia() {\n"
    "        if (!trackSeekSlider || !mediaEl || trackSeekDragging) return;\n"
    "        var d = mediaEl.duration;\n"
    "        if (!isFinite(d) || d <= 0) return;\n"
    "        trackSeekSlider.max = d;\n"
    "        trackSeekSlider.value = mediaEl.currentTime || 0;\n"
    "    }\n"
    "    function syncTrackTransportUI() {\n"
    "        var track = modeSel.value === 'track';\n"
    "        if (trackTransportRow) trackTransportRow.style.display = "
    "track ? '' : 'none';\n"
    "        var has = !!(mediaEl && mediaEl.src);\n"
    "        var on = track && has;\n"
    "        if (btnAudio) {\n"
    "            if (track) btnAudio.disabled = !has;\n"
    "            else btnAudio.disabled = false;\n"
    "        }\n"
    "        if (btnTrackPause) btnTrackPause.disabled = !on;\n"
    "        if (trackSeekSlider) {\n"
    "            if (!has) {\n"
    "                trackSeekSlider.disabled = true;\n"
    "                trackSeekSlider.max = 0.001;\n"
    "                trackSeekSlider.value = 0;\n"
    "            } else {\n"
    "                var d = mediaEl.duration;\n"
    "                var durOk = isFinite(d) && d > 0;\n"
    "                trackSeekSlider.max = durOk ? d : 0.001;\n"
    "                trackSeekSlider.disabled = !on || !durOk;\n"
    "                if (!trackSeekDragging && durOk) {\n"
    "                    trackSeekSlider.value = mediaEl.currentTime || 0;\n"
    "                }\n"
    "            }\n"
    "        }\n"
    "        if (trackTimeLabel) {\n"
    "            if (has) updateTrackTimeLabel();\n"
    "            else trackTimeLabel.textContent = '— / —';\n"
    "        }\n"
    "        syncTransportButtonHighlight();\n"
    "    }\n\n"
    "    function syncTransportButtonHighlight() {\n"
    "        var a = btnAudio, p = btnTrackPause, st = btnStop;\n"
    "        [a, p, st].forEach(function (b) {\n"
    "            if (b) {\n"
    "                b.classList.remove('transport-btn--active');\n"
    "                b.setAttribute('aria-pressed', 'false');\n"
    "            }\n"
    "        });\n"
    "        if (!a) return;\n"
    "        var track = modeSel.value === 'track';\n"
    "        var has = !!(mediaEl && mediaEl.src);\n"
    "        var active = null;\n"
    "        if (track) {\n"
    "            if (has && mediaEl) {\n"
    "                if (!mediaEl.paused && !mediaEl.ended) {\n"
    "                    active = p;\n"
    "                } else if (mediaEl.ended) {\n"
    "                    active = a;\n"
    "                } else if (mediaEl.paused) {\n"
    "                    if (window.__audioStarted) {\n"
    "                        active = a;\n"
    "                    } else {\n"
    "                        var t0 = mediaEl.currentTime || 0;\n"
    "                        active = t0 > 0.01 ? st : a;\n"
    "                    }\n"
    "                }\n"
    "            }\n"
    "        } else {\n"
    "            if (window.__audioStarted) active = st;\n"
    "            else active = a;\n"
    "        }\n"
    "        if (active) {\n"
    "            active.classList.add('transport-btn--active');\n"
    "            active.setAttribute('aria-pressed', 'true');\n"
    "        }\n"
    "    }\n\n"
    "    function getVolume() {"
)
if helpers_inj not in iife2:
    raise SystemExit("trackObjectUrl anchor not found")
iife2 = iife2.replace(helpers_inj, helpers_new, 1)

stop_track_inj = (
    "        prevFftSum = 0;\n"
    "        transientSm = 0;\n"
    "    }\n\n"
    "    function killAllAudio() {"
)
stop_track_new = (
    "        prevFftSum = 0;\n"
    "        transientSm = 0;\n"
    "        syncTrackTransportUI();\n"
    "    }\n\n"
    "    function killAllAudio() {"
)
if stop_track_inj not in iife2:
    raise SystemExit("stopTrack anchor not found")
iife2 = iife2.replace(stop_track_inj, stop_track_new, 1)

audio_track_catch = (
    "                    playTry.catch(function () {\n"
    "                        readout.textContent = 'Playback blocked—click Start again after file selected.';\n"
    "                        window.__audioStarted = false;\n"
    "                    });\n"
    "                }\n"
    "            }\n"
    "        });\n"
    "    });"
)
audio_track_new = (
    "                    playTry.catch(function () {\n"
    "                        readout.textContent = "
    "'Playback blocked—click Play again.';\n"
    "                        window.__audioStarted = false;\n"
    "                        syncTrackTransportUI();\n"
    "                    });\n"
    "                }\n"
    "                syncTrackTransportUI();\n"
    "            }\n"
    "        });\n"
    "    });"
)
if audio_track_catch not in iife2:
    raise SystemExit("btnAudio track catch block not found")
iife2 = iife2.replace(audio_track_catch, audio_track_new, 1)

btn_stop_inj = (
    "    btnStop.addEventListener('click', function () {\n"
    "        if (modeSel.value === 'track' && mediaEl && mediaEl.src) {\n"
    "            mediaEl.pause();\n"
    "            stopOsc();\n"
    "            window.__audioStarted = false;\n"
    "            return;\n"
    "        }\n"
    "        killAllAudio();\n"
    "        window.__audioStarted = false;\n"
    "    });\n\n"
    "    fileIn.addEventListener('change', function () {"
)
btn_stop_new = (
    "    btnStop.addEventListener('click', function () {\n"
    "        if (modeSel.value === 'track' && mediaEl && mediaEl.src) {\n"
    "            mediaEl.pause();\n"
    "            stopOsc();\n"
    "            window.__audioStarted = false;\n"
    "            syncTrackTransportUI();\n"
    "            return;\n"
    "        }\n"
    "        killAllAudio();\n"
    "        window.__audioStarted = false;\n"
    "        syncTrackTransportUI();\n"
    "    });\n\n"
    "    if (trackSeekSlider) {\n"
    "        trackSeekSlider.addEventListener('input', function () {\n"
    "            if (!mediaEl || !mediaEl.src) return;\n"
    "            var t = parseFloat(trackSeekSlider.value);\n"
    "            if (isFinite(t) && t >= 0) {\n"
    "                mediaEl.currentTime = t;\n"
    "                updateTrackTimeLabel();\n"
    "            }\n"
    "        });\n"
    "        trackSeekSlider.addEventListener('mousedown', function () {\n"
    "            trackSeekDragging = true;\n"
    "        });\n"
    "        trackSeekSlider.addEventListener('touchstart', function () {\n"
    "            trackSeekDragging = true;\n"
    "        }, { passive: true });\n"
    "    }\n"
    "    window.addEventListener('mouseup', function () {\n"
    "        if (trackSeekDragging) {\n"
    "            trackSeekDragging = false;\n"
    "            updateSeekSliderFromMedia();\n"
    "        }\n"
    "    });\n"
    "    window.addEventListener('touchend', function () {\n"
    "        if (trackSeekDragging) {\n"
    "            trackSeekDragging = false;\n"
    "            updateSeekSliderFromMedia();\n"
    "        }\n"
    "    });\n"
    "    if (btnTrackPause) btnTrackPause.addEventListener('click', function () {\n"
    "        if (!mediaEl || !mediaEl.src) return;\n"
    "        mediaEl.pause();\n"
    "        syncTrackTransportUI();\n"
    "    });\n\n"
    "    fileIn.addEventListener('change', function () {"
)
if btn_stop_inj not in iife2:
    raise SystemExit("btnStop/fileIn anchor not found")
iife2 = iife2.replace(btn_stop_inj, btn_stop_new, 1)

file_end_inj = (
    "        smoothDomFreq = hzFromDial();\n"
    "    });\n\n"
    "    function hzFromDial() {"
)
file_end_new = (
    "        smoothDomFreq = hzFromDial();\n"
    "        mediaEl.addEventListener('timeupdate', updateTrackTimeLabel);\n"
    "        mediaEl.addEventListener('loadedmetadata', function () { "
    "updateTrackTimeLabel(); syncTrackTransportUI(); });\n"
    "        mediaEl.addEventListener('play', syncTrackTransportUI);\n"
    "        mediaEl.addEventListener('pause', syncTrackTransportUI);\n"
    "        mediaEl.addEventListener('ended', function () { "
    "window.__audioStarted = false; syncTrackTransportUI(); });\n"
    "        syncTrackTransportUI();\n"
    "    });\n\n"
    "    function hzFromDial() {"
)
if file_end_inj not in iife2:
    raise SystemExit("fileIn end anchor not found")
iife2 = iife2.replace(file_end_inj, file_end_new, 1)

# Pattern intensity presets + wave tuning (portal)
wh_amp = (
    "        var edge = 0.3 + 0.7 * edgeT;\n\n"
    "        var amp = ampNorm * 0.58 * (1 + tr * simControls.beatPunch * 0.65 + "
    "B.bass * 0.35);"
)
wh_amp_new = (
    "        var edge = simControls.edgeRimMin + (1 - simControls.edgeRimMin) * edgeT;\n\n"
    "        var amp = ampNorm * simControls.heightAmp * (1 + tr * "
    "simControls.beatPunch * 0.65 + B.bass * 0.35);"
)
if wh_amp not in iife2:
    raise SystemExit("waveHeight edge/amp anchor not found")
iife2 = iife2.replace(wh_amp, wh_amp_new, 1)

sc_tw = (
    "    var simControls = {\n"
    "        timeWarp: 1,\n"
    "        motionGain: 1.12,"
)
sc_tw_new = (
    "    var simControls = {\n"
    "        timeWarp: 1,\n"
    "        heightAmp: 0.58,\n"
    "        edgeRimMin: 0.3,\n"
    "        motionGain: 1.12,"
)
if sc_tw not in iife2:
    raise SystemExit("simControls open anchor not found")
iife2 = iife2.replace(sc_tw, sc_tw_new, 1)

agg_inj = (
    "        audioBrightBoost: 0.65\n"
    "    };\n\n"
    "    function setupGui() {"
)
agg_new = (
    "        audioBrightBoost: 0.65\n"
    "    };\n\n"
    "    function refreshDatGuiDisplay(root) {\n"
    "        if (!root) return;\n"
    "        var i;\n"
    "        if (root.__controllers) {\n"
    "            for (i = 0; i < root.__controllers.length; i++) {\n"
    "                try { root.__controllers[i].updateDisplay(); } catch (e0) {}\n"
    "            }\n"
    "        }\n"
    "        if (root.__folders) {\n"
    "            for (i = 0; i < root.__folders.length; i++) {\n"
    "                refreshDatGuiDisplay(root.__folders[i]);\n"
    "            }\n"
    "        }\n"
    "    }\n\n"
    "    var AGGRESSION_PRESETS = {\n"
    "        balanced: {\n"
    "            heightAmp: 0.58, edgeRimMin: 0.3, motionGain: 1.12, "
    "zExtrude: 0.48, fogDensity: 0.045,\n"
    "            pointSizeMul: 1, interference: 0.78, fineRipple: 0.45, "
    "colorVibrance: 1.05,\n"
    "            beatPunch: 1.15, bandMotion: 0.95, transientRipple: 0.62\n"
    "        }\n"
    "    };\n\n"
    "    /** Param c anchor for Julia escape backdrop (wandering mode). */\n"
    "    var fractalBackdropJuliaBaseCr = -0.355;\n"
    "    var fractalBackdropJuliaBaseCi = 0.595;\n\n"
    "    function applyAggressionPreset(key) {\n"
    "        if (key === 'fractalMB') {\n"
    "            if (typeof __cpIsAggressionAllowed === 'function' && !__cpIsAggressionAllowed('fractalMB')) {\n"
    "                var _cpFbMb = typeof __cpFirstAllowedAggressionValue === 'function' ? __cpFirstAllowedAggressionValue() : 'balanced';\n"
    "                if (aggressionSel) aggressionSel.value = _cpFbMb;\n"
    "                applyAggressionPreset(_cpFbMb);\n"
    "                return;\n"
    "            }\n"
    "            setVisualMode('fractalMB');\n"
    "            refreshDatGuiDisplay(gui);\n"
    "            return;\n"
    "        }\n"
    "        var __whPu =\n"
    "            typeof JULIA_WH_PORTAL_PRESETS !== 'undefined'\n"
    "                ? JULIA_WH_PORTAL_PRESETS[key]\n"
    "                : null;\n"
    "        if (__whPu) {\n"
    "            if (\n"
    "                typeof __cpIsAggressionAllowed === 'function' &&\n"
    "                !__cpIsAggressionAllowed(key)\n"
    "            ) {\n"
    "                var _cpFbWhP =\n"
    "                    typeof __cpFirstAllowedAggressionValue === 'function'\n"
    "                        ? __cpFirstAllowedAggressionValue()\n"
    "                        : 'balanced';\n"
    "                if (aggressionSel) aggressionSel.value = _cpFbWhP;\n"
    "                applyAggressionPreset(_cpFbWhP);\n"
    "                return;\n"
    "            }\n"
    "            wormholeControls.juliaCx = __whPu.cx;\n"
    "            wormholeControls.juliaCy = __whPu.cy;\n"
    "            wormholeControls.juliaFrameZoom = __whPu.frameZoom;\n"
    "            setVisualMode('juliaWormhole');\n"
    "            refreshDatGuiDisplay(gui);\n"
    "            if (wormholeGui) refreshDatGuiDisplay(wormholeGui);\n"
    "            return;\n"
    "        }\n"
    "        if (key === 'fractalJulia') {\n"
    "            if (typeof __cpIsAggressionAllowed === 'function' && !__cpIsAggressionAllowed('fractalJulia')) {\n"
    "                var _cpFbJu = typeof __cpFirstAllowedAggressionValue === 'function' ? __cpFirstAllowedAggressionValue() : 'balanced';\n"
    "                if (aggressionSel) aggressionSel.value = _cpFbJu;\n"
    "                applyAggressionPreset(_cpFbJu);\n"
    "                return;\n"
    "            }\n"
    "            fractalBackdropJuliaBaseCr = -0.355;\n"
    "            fractalBackdropJuliaBaseCi = 0.595;\n"
    "            setVisualMode('fractalJulia');\n"
    "            refreshDatGuiDisplay(gui);\n"
    "            return;\n"
    "        }\n"
    "        setVisualMode('points');\n"
    "        var p = AGGRESSION_PRESETS[key];\n"
    "        if (!p) return;\n"
    "        Object.keys(p).forEach(function (k) {\n"
    "            if (Object.prototype.hasOwnProperty.call(simControls, k)) {\n"
    "                simControls[k] = p[k];\n"
    "            }\n"
    "        });\n"
    "        refreshDatGuiDisplay(gui);\n"
    "    }\n\n"
    "    function setupGui() {"
)
if agg_inj not in iife2:
    raise SystemExit("simControls→setupGui anchor not found")
iife2 = iife2.replace(agg_inj, agg_new, 1)

gui_tw = (
    "        f.add(simControls, 'timeWarp', 0, 2.5).name('animation speed');\n"
    "        f.add(simControls, 'motionGain', 0.2, 2.4).name('motion gain');"
)
gui_tw_new = (
    "        f.add(simControls, 'timeWarp', 0, 2.5).name('animation speed');\n"
    "        f.add(simControls, 'heightAmp', 0.35, 0.98).name('wave height amp');\n"
    "        f.add(simControls, 'edgeRimMin', 0.08, 0.52).name('rim softness');\n"
    "        f.add(simControls, 'motionGain', 0.2, 2.4).name('motion gain');"
)
if gui_tw not in iife2:
    raise SystemExit("setupGui timeWarp/motionGain anchor not found")
iife2 = iife2.replace(gui_tw, gui_tw_new, 1)

sgui_key = (
    "    setupGui();\n\n"
    "    window.addEventListener('keydown', function (e) {\n"
    "        if ((e.key === 'h' || e.key === 'H') && gui && "
    "gui.__pmDatGuiToggleVisibility) {\n"
    "            gui.__pmDatGuiToggleVisibility();\n"
    "        }\n"
    "    });"
)
sgui_key_new = (
    "    setupGui();\n"
    "    if (aggressionSel) {\n"
    "        if (typeof __cpMigrateAggressionPortalSelect === 'function') {\n"
    "            __cpMigrateAggressionPortalSelect();\n"
    "        }\n"
    "        aggressionSel.addEventListener('change', function () {\n"
    "            applyAggressionPreset(aggressionSel.value);\n"
    "        });\n"
    "        applyAggressionPreset(aggressionSel.value);\n"
    "    }\n"
    "    setTimeout(function () {\n"
    "        if (window.__cpApplySubscriptionGates) window.__cpApplySubscriptionGates();\n"
    "    }, 0);\n\n"
    "    window.addEventListener('keydown', function (e) {\n"
    "        if ((e.key === 'h' || e.key === 'H') && gui && "
    "gui.__pmDatGuiToggleVisibility) {\n"
    "            gui.__pmDatGuiToggleVisibility();\n"
    "        }\n"
    "    });"
)
if sgui_key not in iife2:
    raise SystemExit("setupGui/keydown anchor not found")
iife2 = iife2.replace(sgui_key, sgui_key_new, 1)

_splat_path = root / "_portal_splat_inject.js"
if not _splat_path.is_file():
    raise SystemExit("Missing _portal_splat_inject.js (Gaussian splat helpers)")
_splat_helpers = _splat_path.read_text(encoding="utf-8").rstrip() + "\n"

_splat_var_anchor = (
    "    var pointsMat = null;\n"
    "    var pointsObj = null;\n"
    "    var N = 0;\n\n"
    "    particleCapLabel.textContent = String(PARTICLE_CAP);"
)
_splat_var_replacement = (
    "    var pointsMat = null;\n"
    + _splat_helpers
    + "    var pointsObj = null;\n"
    "    var N = 0;\n\n"
    "    particleCapLabel.textContent = String(PARTICLE_CAP);"
)
if _splat_var_anchor not in iife2:
    raise SystemExit("splat var anchor not found")
iife2 = iife2.replace(_splat_var_anchor, _splat_var_replacement, 1)

_rebuild_old = (
    "    function rebuildParticles(newN) {\n"
    "        newN = particleClamp(newN);\n"
    "        if (pointsObj && newN === N) {\n"
    "            particleSlider.value = String(N);\n"
    "            particleNum.value = String(N);\n"
    "            return;\n"
    "        }\n"
    "        if (pointsObj) {\n"
    "            scene.remove(pointsObj);\n"
    "            pointsObj = null;\n"
    "        }\n"
    "        if (geom) {\n"
    "            try { geom.dispose(); } catch (e0) {}\n"
    "            geom = null;\n"
    "        }\n"
    "        N = newN;\n"
    "        baseXY = new Float32Array(N * 2);\n"
    "        polarR = new Float32Array(N);\n"
    "        polarTh = new Float32Array(N);\n"
    "        var pos = new Float32Array(N * 3);\n"
    "        var colors = new Float32Array(N * 3);\n"
    "        seedDiskParticles(N, baseXY, polarR, polarTh, pos, colors);\n"
    "        geom = new THREE.BufferGeometry();\n"
    "        geom.addAttribute('position', new THREE.BufferAttribute(pos, 3));\n"
    "        geom.addAttribute('color', new THREE.BufferAttribute(colors, 3));\n"
    "        colAttr = geom.attributes.color.array;\n"
    "        if (!pointsMat) {\n"
    "            pointsMat = new THREE.PointsMaterial({\n"
    "                size: 0.0095,\n"
    "                vertexColors: THREE.VertexColors,\n"
    "                transparent: true,\n"
    "                opacity: 0.95,\n"
    "                blending: THREE.AdditiveBlending,\n"
    "                depthWrite: false,\n"
    "                sizeAttenuation: true\n"
    "            });\n"
    "        }\n"
    "        pointsObj = new THREE.Points(geom, pointsMat);\n"
    "        scene.add(pointsObj);\n"
    "        particleSlider.value = String(N);\n"
    "        particleNum.value = String(N);\n"
    "    }"
)
_rebuild_new = (
    "    function rebuildParticles(newN) {\n"
    "        newN = particleClamp(newN);\n"
    "        if (pointsObj && newN === N) {\n"
    "            particleSlider.value = String(N);\n"
    "            particleNum.value = String(N);\n"
    "            return;\n"
    "        }\n"
    "        disposeSplatFullMesh();\n"
    "        if (pointsObj) {\n"
    "            scene.remove(pointsObj);\n"
    "            pointsObj = null;\n"
    "        }\n"
    "        if (geom) {\n"
    "            try { geom.dispose(); } catch (e0) {}\n"
    "            geom = null;\n"
    "        }\n"
    "        N = newN;\n"
    "        baseXY = new Float32Array(N * 2);\n"
    "        polarR = new Float32Array(N);\n"
    "        polarTh = new Float32Array(N);\n"
    "        var pos = new Float32Array(N * 3);\n"
    "        var colors = new Float32Array(N * 3);\n"
    "        seedDiskParticles(N, baseXY, polarR, polarTh, pos, colors);\n"
    "        geom = new THREE.BufferGeometry();\n"
    "        geom.addAttribute('position', new THREE.BufferAttribute(pos, 3));\n"
    "        geom.addAttribute('color', new THREE.BufferAttribute(colors, 3));\n"
    "        colAttr = geom.attributes.color.array;\n"
    "        if (!pointsClassicMat) {\n"
    "            pointsClassicMat = new THREE.PointsMaterial({\n"
    "                size: 0.0095,\n"
    "                vertexColors: THREE.VertexColors,\n"
    "                transparent: true,\n"
    "                opacity: 0.95,\n"
    "                blending: THREE.AdditiveBlending,\n"
    "                depthWrite: false,\n"
    "                sizeAttenuation: true\n"
    "            });\n"
    "            pointsMat = pointsClassicMat;\n"
    "        }\n"
    "        pointsObj = new THREE.Points(geom, pointsClassicMat);\n"
    "        scene.add(pointsObj);\n"
    "        setVisualMode(visualMode);\n"
    "        particleSlider.value = String(N);\n"
    "        particleNum.value = String(N);\n"
    "    }"
)
if _rebuild_old not in iife2:
    raise SystemExit("rebuildParticles patch anchor not found")
iife2 = iife2.replace(_rebuild_old, _rebuild_new, 1)

_anim_old = (
    "        var arr = geom.attributes.position.array;\n"
    "        var zScale = simControls.zExtrude;\n"
    "        var tr = snap.transient || 0;\n"
    "        for (var i = 0; i < N; i++) {\n"
    "            var x0 = baseXY[i * 2];\n"
    "            var y0 = baseXY[i * 2 + 1];\n"
    "            var r = polarR[i];\n"
    "            var th = polarTh[i];\n"
    "            var h = waveHeight(r, th, time, hz, lvl, snap);\n"
    "            arr[i * 3] = x0;\n"
    "            arr[i * 3 + 1] = y0;\n"
    "            arr[i * 3 + 2] = h * zScale;\n"
    "            heightToColor(h * 0.95, tr, colAttr, i * 3, snap);\n"
    "        }\n"
    "        geom.attributes.position.needsUpdate = true;\n"
    "        geom.attributes.color.needsUpdate = true;\n\n"
    "        pointsMat.size = (N > 25000 ? 0.0068 : N > 14000 ? 0.008 : 0.0095) * "
    "simControls.pointSizeMul;\n\n"
    "        var zCam = 2.5 - zoom * 0.75;"
)
_anim_new = (
    "        var arr = geom.attributes.position.array;\n"
    "        var zScale = simControls.zExtrude;\n"
    "        var tr = snap.transient || 0;\n"
    "        var splatFullNow = visualMode === 'splatFull' && splatFullInstPos && "
    "splatFullInstCol;\n"
    "        var spA = splatFullNow ? splatFullInstPos.array : null;\n"
    "        var scA = splatFullNow ? splatFullInstCol.array : null;\n"
    "        var fractalMB = visualMode === 'fractalMB';\n"
    "        var fractalJulia = visualMode === 'fractalJulia';\n"
    "        var fractalNow = fractalMB || fractalJulia;\n"
    "        if (fractalBackdropMat && fractalBackdropMesh && fractalBackdropRig) {\n"
    "            var showFb = fractalNow;\n"
    "            fractalBackdropRig.visible = showFb;\n"
    "            if (!showFb) {\n"
    "                fractalSmViewInit = false;\n"
    "                fractalMbTourSeg = -1;\n"
    "                fractalMbJourney = 0;\n"
    "                fractalMbJourneyRateSm = 1;\n"
    "                fractalMbViewWobbleSm = 0;\n"
    "                fractalMbInteriorPh0 = 0;\n"
    "                fractalMbInteriorPh1 = 0;\n"
    "                fractalMbInteriorPh2 = 0;\n"
    "                fractalMbInteriorSpinAccum = 0;\n"
    "                fractalMbInteriorSpinRateSm = 0.12;\n"
    "                fractalMbArmDriveSlow = 0;\n"
    "                fractalMbArmDriveFast = 0;\n"
    "                fractalJuliaTourSeg = -1;\n"
    "                fractalJuliaFlow = 0;\n"
    "                fractalJuliaLegIndex = 0;\n"
    "                fractalJuliaSpiralAccum = 0;\n"
    "                fractalSmJSpiralAudio = 0;\n"
    "                fractalJuliaFastLvl = 0;\n"
    "                fractalJuliaBandDriftCr = 0;\n"
    "                fractalJuliaBandDriftCi = 0;\n"
    "                fractalJuliaRmsDrift = 0;\n"
    "                fractalJuliaOrbitPh = 0;\n"
    "                fractalJuliaOrbitPh2 = 0;\n"
    "                fractalJuliaConnectEnergy = 0;\n"
    "                fractalJuliaConnectSm = 0;\n"
    "                fractalJuliaSmTr = 0;\n"
    "                fractalJuliaDiscEffSm = 0.135;\n"
    "            }\n"
    "            if (showFb) {\n"
    "                if (!fractalSmViewInit) {\n"
    "                    fractalSmViewPos.copy(camera.position);\n"
    "                    fractalSmViewQuat.copy(camera.quaternion);\n"
    "                    fractalSmViewInit = true;\n"
    "                } else {\n"
    "                    var viewA = 1 - Math.exp(-dt / 1.55);\n"
    "                    fractalSmViewPos.lerp(camera.position, viewA);\n"
    "                    fractalSmViewQuat.slerp(camera.quaternion, viewA);\n"
    "                }\n"
    "                fractalBackdropRig.position.copy(fractalSmViewPos);\n"
    "                fractalBackdropRig.quaternion.copy(fractalSmViewQuat);\n"
    "                layoutFractalBackdrop();\n"
    "                var vp = renderer.getSize();\n"
    "                fractalBackdropMat.uniforms.u_resolution.value.set(vp.width, vp.height);\n"
    "                fractalBackdropMat.uniforms.u_escapeRadius.value = 2;\n"
    "                var Bf = snap.bands || null;\n"
    "                fractalSmAudioLvl = fractalExpSmooth(\n"
    "                    fractalSmAudioLvl,\n"
    "                    lvl,\n"
    "                    dt,\n"
    "                    fractalMB ? 0.115 : 0.16\n"
    "                );\n"
    "                fractalSmAudioBT = fractalExpSmooth(\n"
    "                    fractalSmAudioBT,\n"
    "                    Bf ? (Bf.bass - Bf.treble) : 0,\n"
    "                    dt,\n"
    "                    fractalMB ? 0.125 : 0.11\n"
    "                );\n"
    "                var palTarget =\n"
    "                    time * (fractalJulia ? 0.24 : (fractalMB ? 0.09 : 0.24)) +\n"
    "                    fractalSmAudioBT *\n"
    "                        (fractalJulia ? 0.22 : (fractalMB ? 0.28 : 0.55)) +\n"
    "                    fractalSmAudioLvl *\n"
    "                        (fractalJulia ? 0.22 : (fractalMB ? 0.2 : 0.42)) +\n"
    "                    (Bf\n"
    "                        ? (Bf.mid - 0.5) *\n"
    "                            (fractalJulia ? 0.04 : (fractalMB ? 0.042 : 0.1))\n"
    "                        : 0);\n"
    "                var palTau = fractalJulia ? 0.58 : (fractalMB ? 0.44 : 0.09);\n"
    "                fractalSmPal = fractalExpSmooth(fractalSmPal, palTarget, dt, palTau);\n"
    "                var colorITarget =\n"
    "                    0.4 + fractalSmAudioLvl * 0.42 + (Bf ? Bf.mid * 0.14 : 0);\n"
    "                fractalSmColorI = fractalExpSmooth(\n"
    "                    fractalSmColorI,\n"
    "                    colorITarget,\n"
    "                    dt,\n"
    "                    fractalMB ? 0.26 : 0.15\n"
    "                );\n"
    "                fractalBackdropMat.uniforms.u_colorIntensity.value = fractalSmColorI;\n"
    "                if (fractalMB) {\n"
    "                    var mbZoomMin = -0.52;\n"
    "                    var mbZoomMax = 10.85;\n"
    "                    var mbSegDur = 22.4;\n"
    "                    var MB_TOUR = [\n"
    "                        { x: -0.75125, y: 0.10845 },\n"
    "                        { x: -0.74785, y: 0.11815 },\n"
    "                        { x: -0.74535, y: 0.12475 },\n"
    "                        { x: -0.743643887037151, y: 0.131825904037152 },\n"
    "                        { x: -0.743003, y: 0.126201 },\n"
    "                        { x: -0.74232, y: 0.13212 },\n"
    "                        { x: -0.74488, y: 0.12835 },\n"
    "                        { x: -0.74695, y: 0.12015 },\n"
    "                        { x: -0.74942, y: 0.11472 },\n"
    "                        { x: -0.743643887037151, y: 0.131825904037152 }\n"
    "                    ];\n"
    "                    var mbLen = MB_TOUR.length;\n"
    "                    var mbNeedHardSnap = fractalMbTourSeg === -1;\n"
    "                    if (fractalMbTourSeg === -1) {\n"
    "                        fractalMbTourSeg = 1;\n"
    "                        fractalMbJourney = 0;\n"
    "                    }\n"
    "                    var mbZoomRate =\n"
    "                        1.1 +\n"
    "                        fractalSmAudioLvl * 0.92 +\n"
    "                        (Bf ? Bf.mid * 0.26 : 0);\n"
    "                    mbZoomRate = Math.max(0.92, Math.min(2.52, mbZoomRate));\n"
    "                    var mbDriveMul = 1 + fractalSmAudioLvl * 0.14;\n"
    "                    var mbRateRaw = mbZoomRate * mbDriveMul;\n"
    "                    if (mbNeedHardSnap) {\n"
    "                        fractalMbJourneyRateSm = mbRateRaw;\n"
    "                    } else {\n"
    "                        fractalMbJourneyRateSm = fractalExpSmooth(\n"
    "                            fractalMbJourneyRateSm,\n"
    "                            mbRateRaw,\n"
    "                            dt,\n"
    "                            0.72\n"
    "                        );\n"
    "                    }\n"
    "                    fractalMbJourney += (dt / mbSegDur) * fractalMbJourneyRateSm;\n"
    "                    var mbTourLaps = fractalMbJourney / mbLen;\n"
    "                    var mbTourPhase = mbTourLaps - Math.floor(mbTourLaps);\n"
    "                    var mbTau = 6.283185307179586 * mbTourLaps;\n"
    "                    var mbZt = 0.5 - 0.5 * Math.cos(mbTau);\n"
    "                    mbZt = mbZt * mbZt * (3 - 2 * mbZt);\n"
    "                    var mbZoomNorm = mbZt;\n"
    "                    mbZoomNorm = mbZoomNorm * mbZoomNorm * (3 - 2 * mbZoomNorm);\n"
    "                    var mbZoomSpan = mbZoomMax - mbZoomMin;\n"
    "                    var mbZoomLo = mbZoomMin + mbZoomSpan * 0.035;\n"
    "                    var mbTargetZoom = mbZoomLo + mbZoomNorm * (mbZoomMax * 0.995 - mbZoomLo);\n"
    "                    mbTargetZoom = Math.max(-0.58, Math.min(10.65, mbTargetZoom));\n"
    "                    var mbSegFloat = mbTourPhase * mbLen;\n"
    "                    if (mbSegFloat >= mbLen) { mbSegFloat = mbLen - 1e-7; }\n"
    "                    var mbSegI = Math.floor(mbSegFloat);\n"
    "                    var mbI = ((mbSegI % mbLen) + mbLen) % mbLen;\n"
    "                    var mbNextI = (mbI + 1) % mbLen;\n"
    "                    var mbLegT = mbSegFloat - mbSegI;\n"
    "                    if (mbLegT < 0) { mbLegT = 0; }\n"
    "                    if (mbLegT > 1) { mbLegT = 1; }\n"
    "                    var mbEase = mbLegT * mbLegT * (3 - 2 * mbLegT);\n"
    "                    var mbCx =\n"
    "                        MB_TOUR[mbI].x +\n"
    "                        mbEase * (MB_TOUR[mbNextI].x - MB_TOUR[mbI].x);\n"
    "                    var mbCy =\n"
    "                        MB_TOUR[mbI].y +\n"
    "                        mbEase * (MB_TOUR[mbNextI].y - MB_TOUR[mbI].y);\n"
    "                    var mbOvThr = 0.22;\n"
    "                    if (mbTargetZoom < mbOvThr) {\n"
    "                        var mbOb = (mbOvThr - mbTargetZoom) / (mbOvThr - mbZoomMin);\n"
    "                        if (mbOb > 1) { mbOb = 1; }\n"
    "                        if (mbOb < 0) { mbOb = 0; }\n"
    "                        var mbOvCx = -0.55;\n"
    "                        var mbOvCy = 0;\n"
    "                        mbCx = mbCx * (1 - mbOb) + mbOvCx * mbOb;\n"
    "                        mbCy = mbCy * (1 - mbOb) + mbOvCy * mbOb;\n"
    "                    }\n"
    "                    var mbFine =\n"
    "                        fractalSmAudioLvl * 12 +\n"
    "                        (Bf\n"
    "                            ? (Bf.mid - 0.5) * 12 +\n"
    "                                (Bf.treble - 0.5) * 13 +\n"
    "                                (Bf.high - 0.5) * 13 +\n"
    "                                (Bf.bass - 0.5) * 9 +\n"
    "                                (Bf.lowMid - 0.5) * 10\n"
    "                            : 0);\n"
    "                    var maxIterTarget = Math.min(\n"
    "                        520,\n"
    "                        Math.max(\n"
    "                            124,\n"
    "                            104 +\n"
    "                                mbTargetZoom * 56 +\n"
    "                                mbFine +\n"
    "                                tr * 8\n"
    "                        )\n"
    "                    );\n"
    "                    if (mbNeedHardSnap) {\n"
    "                        fractalSmZoom = mbTargetZoom;\n"
    "                        fractalSmCx = mbCx;\n"
    "                        fractalSmCy = mbCy;\n"
    "                    } else {\n"
    "                        fractalSmZoom = fractalExpSmooth(fractalSmZoom, mbTargetZoom, dt, 0.62);\n"
    "                        fractalSmCx = fractalExpSmooth(fractalSmCx, mbCx, dt, 0.52);\n"
    "                        fractalSmCy = fractalExpSmooth(fractalSmCy, mbCy, dt, 0.52);\n"
    "                    }\n"
    "                    fractalSmMaxIter = fractalExpSmooth(\n"
    "                        fractalSmMaxIter,\n"
    "                        maxIterTarget,\n"
    "                        dt,\n"
    "                        0.72\n"
    "                    );\n"
    "                    var mbInPh0T =\n"
    "                        fractalSmZoom * 0.16 + fractalSmPal * 0.4 +\n"
    "                        (Bf ? (Bf.mid - 0.5) * 0.07 : 0);\n"
    "                    var mbInPh1T = fractalSmPal * 1.02 + fractalSmZoom * 0.11 + time * 0.055;\n"
    "                    var mbInPh2T = fractalSmPal * 1.78 + fractalSmAudioLvl * 0.085;\n"
    "                    fractalMbInteriorPh0 = fractalExpSmooth(\n"
    "                        fractalMbInteriorPh0,\n"
    "                        mbInPh0T,\n"
    "                        dt,\n"
    "                        0.58\n"
    "                    );\n"
    "                    fractalMbInteriorPh1 = fractalExpSmooth(\n"
    "                        fractalMbInteriorPh1,\n"
    "                        mbInPh1T,\n"
    "                        dt,\n"
    "                        0.64\n"
    "                    );\n"
    "                    fractalMbInteriorPh2 = fractalExpSmooth(\n"
    "                        fractalMbInteriorPh2,\n"
    "                        mbInPh2T,\n"
    "                        dt,\n"
    "                        0.54\n"
    "                    );\n"
    "                    fractalBackdropMat.uniforms.u_mbInteriorPhase.value.set(\n"
    "                        fractalMbInteriorPh0,\n"
    "                        fractalMbInteriorPh1,\n"
    "                        fractalMbInteriorPh2\n"
    "                    );\n"
    "                    var rmsMb = snap.rms != null ? snap.rms : 0;\n"
    "                    var mbSpinTarget =\n"
    "                        0.055 +\n"
    "                        fractalSmAudioLvl * 1.95 +\n"
    "                        lvl * 1.5 +\n"
    "                        (Bf\n"
    "                            ? Bf.mid * 0.52 +\n"
    "                                Bf.bass * 0.28 +\n"
    "                                (Bf.treble - 0.5) * 0.12\n"
    "                            : 0) +\n"
    "                        tr * 0.35 +\n"
    "                        rmsMb * 0.45;\n"
    "                    mbSpinTarget = Math.max(0.028, Math.min(3.5, mbSpinTarget));\n"
    "                    fractalMbInteriorSpinRateSm = fractalExpSmooth(\n"
    "                        fractalMbInteriorSpinRateSm,\n"
    "                        mbSpinTarget,\n"
    "                        dt,\n"
    "                        0.19\n"
    "                    );\n"
    "                    fractalMbInteriorSpinAccum += dt * fractalMbInteriorSpinRateSm;\n"
    "                    fractalBackdropMat.uniforms.u_mbInteriorSpin.value =\n"
    "                        fractalMbInteriorSpinAccum;\n"
    "                    var mbArmRaw =\n"
    "                        fractalSmAudioLvl * 0.58 +\n"
    "                        lvl * 0.52 +\n"
    "                        (Bf\n"
    "                            ? Bf.treble * 0.45 +\n"
    "                                Bf.high * 0.4 +\n"
    "                                (Bf.mid - 0.5) * 0.18\n"
    "                            : 0) +\n"
    "                        tr * 0.58 +\n"
    "                        rmsMb * 0.52;\n"
    "                    fractalMbArmDriveSlow = fractalExpSmooth(\n"
    "                        fractalMbArmDriveSlow,\n"
    "                        mbArmRaw,\n"
    "                        dt,\n"
    "                        0.17\n"
    "                    );\n"
    "                    fractalMbArmDriveFast = fractalExpSmooth(\n"
    "                        fractalMbArmDriveFast,\n"
    "                        mbArmRaw,\n"
    "                        dt,\n"
    "                        0.058\n"
    "                    );\n"
    "                    fractalBackdropMat.uniforms.u_mbArmDrive.value = Math.min(\n"
    "                        1.35,\n"
    "                        fractalMbArmDriveSlow * 0.4 + fractalMbArmDriveFast * 0.6\n"
    "                    );\n"
    "                    fractalBackdropMat.uniforms.u_isJulia.value = 0;\n"
    "                    fractalBackdropMat.uniforms.u_center.value.set(fractalSmCx, fractalSmCy);\n"
    "                    fractalBackdropMat.uniforms.u_zoom.value = fractalSmZoom;\n"
    "                    fractalBackdropMat.uniforms.u_maxIter.value = fractalSmMaxIter;\n"
    "                    fractalBackdropMat.uniforms.u_paletteOffset.value = fractalSmPal;\n"
    "                    var mbViewWobbleTarget =\n"
    "                        fractalSmAudioBT * 0.05 +\n"
    "                        (Bf ? (Bf.treble - 0.5) * 0.032 + (Bf.high - 0.5) * 0.028 : 0);\n"
    "                    fractalMbViewWobbleSm = fractalExpSmooth(\n"
    "                        fractalMbViewWobbleSm,\n"
    "                        mbViewWobbleTarget,\n"
    "                        dt,\n"
    "                        0.15\n"
    "                    );\n"
    "                    fractalBackdropMat.uniforms.u_viewAngle.value =\n"
    "                        time * 0.033 + fractalMbViewWobbleSm;\n"
    "                    fractalBackdropMat.uniforms.u_spiralPhase.value = 0;\n"
    "                } else {\n"
    "                    fractalBackdropMat.uniforms.u_isJulia.value = 1;\n"
    "                    fractalBackdropMat.uniforms.u_viewAngle.value = time * 0.072;\n"
    "                    var juliaNeedSnap = fractalJuliaTourSeg === -1;\n"
    "                    if (fractalJuliaTourSeg === -1) {\n"
    "                        fractalJuliaTourSeg = 1;\n"
    "                        fractalJuliaFlow = 0;\n"
    "                        fractalJuliaLegIndex = 0;\n"
    "                    }\n"
    "                    var jLvlDrive = fractalSmAudioLvl * 0.52 + lvl * 0.48;\n"
    "                    var rmsN = snap.rms != null ? snap.rms : 0;\n"
    "                    var fluxN = snap.fluxNorm != null ? snap.fluxNorm : 0;\n"
    "                    fractalJuliaConnectEnergy +=\n"
    "                        dt *\n"
    "                        (3.35 * tr + 2.5 * fluxN + 1.12 * rmsN + 0.34 * lvl);\n"
    "                    fractalJuliaConnectEnergy *= Math.exp(-dt * 1.02);\n"
    "                    fractalJuliaConnectEnergy = Math.min(2.65, fractalJuliaConnectEnergy);\n"
    "                    fractalJuliaConnectSm = fractalExpSmooth(\n"
    "                        fractalJuliaConnectSm,\n"
    "                        fractalJuliaConnectEnergy,\n"
    "                        dt,\n"
    "                        0.11\n"
    "                    );\n"
    "                    fractalJuliaSmTr = fractalExpSmooth(fractalJuliaSmTr, tr, dt, 0.092);\n"
    "                    var trJ = fractalJuliaSmTr * 0.8 + tr * 0.2;\n"
    "                    fractalJuliaOrbitPh +=\n"
    "                        dt *\n"
    "                        (0.287 +\n"
    "                            lvl * 0.403 +\n"
    "                            fractalSmAudioLvl * 0.496 +\n"
    "                            rmsN * 0.558 +\n"
    "                            trJ * 0.232 +\n"
    "                            fluxN * 0.28 +\n"
    "                            (Bf\n"
    "                                ? Bf.mid * 0.202 +\n"
    "                                    Bf.bass * 0.155 +\n"
    "                                    Bf.lowMid * 0.112\n"
    "                                : 0));\n"
    "                    fractalJuliaOrbitPh2 +=\n"
    "                        dt *\n"
    "                        (0.229 +\n"
    "                            jLvlDrive * 0.357 +\n"
    "                            rmsN * 0.465 +\n"
    "                            trJ * 0.202 +\n"
    "                            fluxN * 0.22 +\n"
    "                            (Bf ? Bf.high * 0.093 + Bf.treble * 0.085 : 0));\n"
    "                    fractalJuliaFastLvl = fractalExpSmooth(\n"
    "                        fractalJuliaFastLvl,\n"
    "                        jLvlDrive,\n"
    "                        dt,\n"
    "                        0.17\n"
    "                    );\n"
    "                    var jBreath = fractalJuliaFastLvl - fractalSmAudioLvl;\n"
    "                    var bandMixCr =\n"
    "                        Bf\n"
    "                            ? (Bf.mid - 0.5) * 0.11 +\n"
    "                                (Bf.bass - Bf.treble) * 0.07 +\n"
    "                                (Bf.lowMid - 0.5) * 0.08 +\n"
    "                                (Bf.high - 0.5) * 0.04\n"
    "                            : 0;\n"
    "                    var bandMixCi =\n"
    "                        Bf\n"
    "                            ? (Bf.mid - 0.5) * 0.1 +\n"
    "                                (Bf.lowMid - Bf.high) * 0.065 +\n"
    "                                Bf.sub * 0.06 +\n"
    "                                (0.5 - Bf.treble) * 0.045\n"
    "                            : 0;\n"
    "                    fractalJuliaBandDriftCr = fractalExpSmooth(\n"
    "                        fractalJuliaBandDriftCr,\n"
    "                        bandMixCr,\n"
    "                        dt,\n"
    "                        0.32\n"
    "                    );\n"
    "                    fractalJuliaBandDriftCi = fractalExpSmooth(\n"
    "                        fractalJuliaBandDriftCi,\n"
    "                        bandMixCi,\n"
    "                        dt,\n"
    "                        0.32\n"
    "                    );\n"
    "                    fractalJuliaRmsDrift = fractalExpSmooth(\n"
    "                        fractalJuliaRmsDrift,\n"
    "                        rmsN * 0.16 + trJ * 0.11,\n"
    "                        dt,\n"
    "                        0.36\n"
    "                    );\n"
    "                    var hz01x = hzToPalette01(hz);\n"
    "                    var jOrbCr =\n"
    "                        0.065 * Math.sin(fractalJuliaOrbitPh) +\n"
    "                        0.057 *\n"
    "                            Math.cos(\n"
    "                                fractalJuliaOrbitPh * 0.74 + hz01x * 6.28318 * 0.45\n"
    "                            ) +\n"
    "                        0.05 *\n"
    "                            Math.sin(\n"
    "                                fractalJuliaOrbitPh2 * 1.29 + hz01x * 6.28318 * 0.52\n"
    "                            ) +\n"
    "                        0.042 *\n"
    "                            Math.cos(\n"
    "                                fractalJuliaOrbitPh * 0.42 - fractalJuliaOrbitPh2 * 0.91\n"
    "                            );\n"
    "                    var jOrbCi =\n"
    "                        0.062 * Math.cos(fractalJuliaOrbitPh * 0.89) +\n"
    "                        0.054 *\n"
    "                            Math.sin(\n"
    "                                fractalJuliaOrbitPh2 * 0.94 + hz01x * 6.28318 * 0.41\n"
    "                            ) +\n"
    "                        0.047 *\n"
    "                            Math.cos(\n"
    "                                fractalJuliaOrbitPh * 1.08 + fractalJuliaOrbitPh2 * 0.57\n"
    "                            ) +\n"
    "                        0.04 *\n"
    "                            Math.sin(fractalJuliaOrbitPh2 * 1.38);\n"
    "                    var jSlowRing =\n"
    "                        Math.sin(\n"
    "                            fractalJuliaOrbitPh * 1.08 + hz01x * 4.2 + fractalJuliaRmsDrift * 1.8\n"
    "                        ) *\n"
    "                        (0.024 + fractalJuliaRmsDrift * 0.075);\n"
    "                    var jSlowRingI =\n"
    "                        Math.cos(\n"
    "                            fractalJuliaOrbitPh2 * 1.02 + hz01x * 3.95 + fractalJuliaRmsDrift * 1.6\n"
    "                        ) *\n"
    "                        (0.022 + fractalJuliaRmsDrift * 0.07);\n"
    "                    var jBaseCr = fractalBackdropJuliaBaseCr;\n"
    "                    var jBaseCi = fractalBackdropJuliaBaseCi;\n"
    "                    var jDiscMaxEff = Math.min(\n"
    "                        0.172,\n"
    "                        0.122 + fractalJuliaSmTr * 0.044 + jLvlDrive * 0.021\n"
    "                    );\n"
    "                    fractalJuliaDiscEffSm = fractalExpSmooth(\n"
    "                        fractalJuliaDiscEffSm,\n"
    "                        jDiscMaxEff,\n"
    "                        dt,\n"
    "                        0.15\n"
    "                    );\n"
    "                    var jConnK = fractalJuliaConnectSm * 0.056;\n"
    "                    var jcrT =\n"
    "                        jBaseCr +\n"
    "                        jLvlDrive * 0.11 +\n"
    "                        jBreath * 0.09 +\n"
    "                        fractalJuliaBandDriftCr * 0.94 +\n"
    "                        fractalSmAudioBT * 0.05 +\n"
    "                        trJ * 0.042 +\n"
    "                        jOrbCr +\n"
    "                        jSlowRing +\n"
    "                        jConnK * -0.846 +\n"
    "                        fractalJuliaConnectSm * 0.018 * Math.sin(hz01x * 6.28318);\n"
    "                    var jciT =\n"
    "                        jBaseCi +\n"
    "                        jLvlDrive * 0.104 +\n"
    "                        jBreath * 0.082 +\n"
    "                        fractalJuliaBandDriftCi * 0.94 +\n"
    "                        fractalSmAudioBT * 0.046 +\n"
    "                        trJ * 0.039 +\n"
    "                        jOrbCi +\n"
    "                        jSlowRingI +\n"
    "                        jConnK * -0.537 +\n"
    "                        fractalJuliaConnectSm * 0.018 * Math.cos(hz01x * 6.28318);\n"
    "                    var jdx = jcrT - jBaseCr;\n"
    "                    var jdy = jciT - jBaseCi;\n"
    "                    var jD2 = jdx * jdx + jdy * jdy;\n"
    "                    if (jD2 > fractalJuliaDiscEffSm * fractalJuliaDiscEffSm) {\n"
    "                        var jS = fractalJuliaDiscEffSm / Math.sqrt(jD2);\n"
    "                        jcrT = jBaseCr + jdx * jS;\n"
    "                        jciT = jBaseCi + jdy * jS;\n"
    "                    }\n"
    "                    if (juliaNeedSnap) {\n"
    "                        fractalSmJcr = jcrT;\n"
    "                        fractalSmJci = jciT;\n"
    "                    } else {\n"
    "                        fractalSmJcr = fractalExpSmooth(fractalSmJcr, jcrT, dt, 0.155);\n"
    "                        fractalSmJci = fractalExpSmooth(fractalSmJci, jciT, dt, 0.155);\n"
    "                    }\n"
    "                    jdx = fractalSmJcr - jBaseCr;\n"
    "                    jdy = fractalSmJci - jBaseCi;\n"
    "                    jD2 = jdx * jdx + jdy * jdy;\n"
    "                    if (jD2 > fractalJuliaDiscEffSm * fractalJuliaDiscEffSm) {\n"
    "                        var jS2 = fractalJuliaDiscEffSm / Math.sqrt(jD2);\n"
    "                        fractalSmJcr = jBaseCr + jdx * jS2;\n"
    "                        fractalSmJci = jBaseCi + jdy * jS2;\n"
    "                    }\n"
    "                    fractalBackdropMat.uniforms.u_c.value.set(fractalSmJcr, fractalSmJci);\n"
    "                    var juliaZoomFixed = 0.48;\n"
    "                    fractalBackdropMat.uniforms.u_center.value.set(0, 0);\n"
    "                    fractalBackdropMat.uniforms.u_zoom.value = juliaZoomFixed;\n"
    "                    fractalSmJZoom = juliaZoomFixed;\n"
    "                    fractalSmJPx = 0;\n"
    "                    fractalSmJPy = 0;\n"
    "                    fractalJuliaSpiralAccum +=\n"
    "                        dt *\n"
    "                        (0.118 +\n"
    "                            lvl * 0.07 +\n"
    "                            fractalSmAudioLvl * 0.075 +\n"
    "                            jLvlDrive * 0.062 +\n"
    "                            fractalJuliaRmsDrift * 0.14 +\n"
    "                            rmsN * 0.09 +\n"
    "                            fluxN * 0.11 +\n"
    "                            (Bf ? Bf.mid * 0.036 + Bf.lowMid * 0.026 : 0));\n"
    "                    var jSpiralAudioT =\n"
    "                        fractalSmAudioLvl * 0.55 +\n"
    "                        jLvlDrive * 0.36 +\n"
    "                        lvl * 0.22 +\n"
    "                        fractalJuliaRmsDrift * 0.45 +\n"
    "                        rmsN * 0.5 +\n"
    "                        trJ * 0.22 +\n"
    "                        fluxN * 0.42 +\n"
    "                        (Bf ? Bf.bass * 0.26 + Bf.lowMid * 0.2 + (Bf.mid - 0.5) * 0.17 : 0) +\n"
    "                        0.35 * Math.sin(fractalJuliaOrbitPh * 0.31) +\n"
    "                        0.28 * Math.cos(fractalJuliaOrbitPh2 * 0.37);\n"
    "                    fractalSmJSpiralAudio = fractalExpSmooth(\n"
    "                        fractalSmJSpiralAudio,\n"
    "                        jSpiralAudioT,\n"
    "                        dt,\n"
    "                        0.32\n"
    "                    );\n"
    "                    fractalBackdropMat.uniforms.u_spiralPhase.value =\n"
    "                        fractalJuliaSpiralAccum + fractalSmJSpiralAudio;\n"
    "                    var jMaxT = Math.min(\n"
    "                        450,\n"
    "                        Math.max(\n"
    "                            232,\n"
    "                            218 +\n"
    "                                fractalSmAudioLvl * 48 +\n"
    "                                jLvlDrive * 40 +\n"
    "                                lvl * 22 +\n"
    "                                fractalJuliaRmsDrift * 32 +\n"
    "                                rmsN * 38 +\n"
    "                                (Bf ? Bf.mid * 40 + Bf.lowMid * 16 : 0) +\n"
    "                                trJ * 26 +\n"
    "                                fluxN * 32 +\n"
    "                                fractalJuliaConnectSm * 14 +\n"
    "                                28 * Math.sin(fractalJuliaOrbitPh * 0.48) +\n"
    "                                22 * Math.cos(fractalJuliaOrbitPh2 * 0.41)\n"
    "                        )\n"
    "                    );\n"
    "                    fractalSmJMaxIter = fractalExpSmooth(fractalSmJMaxIter, jMaxT, dt, 0.34);\n"
    "                    fractalBackdropMat.uniforms.u_maxIter.value = fractalSmJMaxIter;\n"
    "                    fractalBackdropMat.uniforms.u_paletteOffset.value = fractalSmPal;\n"
    "                }\n"
    "            }\n"
    "        }\n"
    "        if (!fractalNow) {\n"
    "            for (var i = 0; i < N; i++) {\n"
    "                var x0 = baseXY[i * 2];\n"
    "                var y0 = baseXY[i * 2 + 1];\n"
    "                var r = polarR[i];\n"
    "                var th = polarTh[i];\n"
    "                var ix = i * 3;\n"
    "                arr[ix] = x0;\n"
    "                arr[ix + 1] = y0;\n"
    "                var h = waveHeight(r, th, time, hz, lvl, snap);\n"
    "                arr[ix + 2] = h * zScale;\n"
    "                heightToColor(h * 0.95, tr, colAttr, ix, snap);\n"
    "                if (splatFullNow) {\n"
    "                    spA[ix] = arr[ix];\n"
    "                    spA[ix + 1] = arr[ix + 1];\n"
    "                    spA[ix + 2] = arr[ix + 2];\n"
    "                    scA[ix] = colAttr[ix];\n"
    "                    scA[ix + 1] = colAttr[ix + 1];\n"
    "                    scA[ix + 2] = colAttr[ix + 2];\n"
    "                }\n"
    "            }\n"
    "            geom.attributes.position.needsUpdate = true;\n"
    "            geom.attributes.color.needsUpdate = true;\n"
    "        }\n"
    "        if (splatFullNow) {\n"
    "            splatFullInstPos.needsUpdate = true;\n"
    "            splatFullInstCol.needsUpdate = true;\n"
    "        }\n\n"
    "        var baseSize = (N > 25000 ? 0.0068 : N > 14000 ? 0.008 : 0.0095) * "
    "simControls.pointSizeMul;\n"
    "        if (pointsClassicMat) {\n"
    "            pointsClassicMat.size = baseSize;\n"
    "        }\n"
    "        if (splatFullMesh && splatFullMesh.material && "
    "splatFullMesh.material.uniforms) {\n"
    "            splatFullMesh.material.uniforms.uSplatScale.value = "
    "Math.max(0.38, baseSize * 34.0);\n"
    "            if (splatFullMesh.material.uniforms.uTime) {\n"
    "                splatFullMesh.material.uniforms.uTime.value = time;\n"
    "            }\n"
    "        }\n\n"
    "        var zCam = 2.5 - zoom * 0.75;"
)
if _anim_old not in iife2:
    raise SystemExit("animate pointSize patch anchor not found")
iife2 = iife2.replace(_anim_old, _anim_new, 1)

# Play control is the icon button (former "Start Audio"); align readout copy
iife2 = iife2.replace(
    "readout.textContent = 'Playback blocked—click Start or Play again.';",
    "readout.textContent = 'Playback blocked—click Play again.';",
)

iife2 = wormhole_iife_patch.apply_julia_wormhole_iife_patch(iife2, root)

(root / "_engine_iife.js").write_text(iife2, encoding="utf-8")

# Shell HTML fragments (SEO meta + JSON-LD — see SEO-AGENT.md §14)
_ORIGIN = _site_origin()
_o = _ORIGIN
shell_head = f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{_SEO_TITLE}</title>
  <meta name="description" content="{_SEO_META_DESCRIPTION.replace('"', '&quot;')}">
  <meta name="keywords" content="{_SEO_KEYWORDS.replace('"', '&quot;')}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="author" content="Nocturnal Labs x SomaTea">
  <meta name="theme-color" content="#030508">
  <link rel="canonical" href="{_o}/">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
  <link rel="icon" href="favicon.ico" sizes="any" type="image/x-icon">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_GB">
  <meta property="og:url" content="{_o}/">
  <meta property="og:site_name" content="Cymatics Portal">
  <meta property="og:title" content="{_SEO_TITLE.replace('"', '&quot;')}">
  <meta property="og:description" content="{_SEO_META_DESCRIPTION.replace('"', '&quot;')}">
  <meta property="og:image" content="{_o}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{_SEO_OG_IMAGE_ALT.replace('"', '&quot;')}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{_SEO_TITLE.replace('"', '&quot;')}">
  <meta name="twitter:description" content="{_SEO_TWITTER_DESCRIPTION.replace('"', '&quot;')}">
  <meta name="twitter:image" content="{_o}/og-image.png">
  <meta name="twitter:image:alt" content="{_SEO_OG_IMAGE_ALT.replace('"', '&quot;')}">

{_json_ld_script_blobs(_ORIGIN)}

  <script>(function(){{if(/#skip-landing|\\?skip=1(?:&|$)/.test(location.href)){{document.documentElement.classList.add('skip-landing');}}}})();</script>
  <link rel="stylesheet" href="./landing/css/landing.css">
  <style>
    /* First paint: external landing.css may arrive late; avoid a flash of title-case markup */
    #landing-root .logo-title {{
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
    }}
  </style>
  <script src="vendor/dat.gui.min.js"></script>
  <script src="vendor/three.r76.min.js"></script>
  <style>
"""

skin_path = root / "_portal_nifty.css"
if skin_path.exists():
    portal_css = skin_path.read_text(encoding="utf-8")
else:
    shell_css = Path(root / "index.html").read_text(encoding="utf-8")
    css_m = re.search(r"<style>([\s\S]*?)</style>", shell_css)
    if not css_m:
        raise SystemExit("could not read css from index.html (or _portal_nifty.css)")
    portal_css = css_m.group(1).strip() + "\n"
    portal_css = portal_css.replace(
        ".row-hidden { display: none !important; }\n\n    ",
        "",
    )

# LANDING_PAGE_FIXES.md — hide quality gate (DOM stays; auto-click sets Medium)
portal_css += """
    /* Landing: hide quality gate — elements remain for particle engine */
    #landing-root .quality-selector {
      opacity: 0 !important;
      pointer-events: none !important;
    }
    #landing-root .quality-title {
      opacity: 0 !important;
    }

    /* Hero block: user offset −0.75cm X, +1.5cm Y (wording + Enter Portal move together) */
    #landing-root .menu {
      position: fixed !important;
      left: max(28px, 5vw) !important;
      right: auto !important;
      top: 50vh !important;
      bottom: auto !important;
      transform: translate(-0.75cm, calc(-50% - clamp(12px, 2.2vh, 30px) + 1.5cm)) !important;
      z-index: 6;
      box-sizing: border-box !important;
      margin-left: 0 !important;
      margin-top: 0 !important;
      width: min(540px, calc(100vw - max(52px, 10vw))) !important;
      min-width: 260px;
      max-width: calc(100vw - max(52px, 10vw));
      max-height: none !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      padding-right: max(12px, 1.5vw);
    }
    @media screen and (max-device-width: 640px) {
      #landing-root .menu {
        left: max(18px, 4vw) !important;
        width: calc(100vw - max(36px, 9vw)) !important;
        transform: translate(-0.75cm, calc(-50% - clamp(10px, 2vh, 26px) + 1.5cm)) !important;
      }
    }

    /* Narrow left column: more room for particle hero; intro + CTA share width */
    #landing-root .landing-hero-stack {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      box-sizing: border-box;
      --landing-hero-measure: min(38ch, 100%);
    }

    #landing-root .landing-hero-intro {
      text-align: left;
      user-select: text;
      -webkit-user-select: text;
      cursor: auto;
      text-shadow: 0 2px 14px rgba(0,0,0,0.55);
      width: 100%;
      max-width: var(--landing-hero-measure);
      box-sizing: border-box;
    }

    /* +30% headline type; two-line stack, left-aligned with narrow column */
    #landing-root .landing-hero-kicker {
      margin: 0 0 0.75em;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.12em;
      font-weight: 700;
      line-height: 1.22;
      color: rgba(255,255,255,0.97);
      letter-spacing: 0.03em;
      text-align: left;
    }

    #landing-root .landing-hero-kicker-line1,
    #landing-root .landing-hero-kicker-line2 {
      font-size: clamp(20.8px, 2.47vw, 27.3px);
      font-style: normal;
    }

    #landing-root .landing-hero-kicker-line2 {
      margin-left: 0;
      letter-spacing: 0.035em;
      opacity: 0.94;
    }

    #landing-root .landing-hero-lead,
    #landing-root .landing-hero-note {
      margin: 0 0 1em;
      font-size: clamp(13px, 1.48vw, 16px);
      line-height: 1.62;
      color: rgba(255,255,255,0.88);
      overflow-wrap: break-word;
    }

    #landing-root .landing-hero-note {
      margin-bottom: 0.9em;
      color: rgba(255,255,255,0.84);
    }

    #landing-root .landing-hero-close {
      margin: 0;
      margin-top: 0.35em;
      font-size: clamp(13px, 1.45vw, 16px);
      font-weight: 700;
      line-height: 1.5;
      color: rgba(180,215,255,0.95);
    }

    #landing-root .landing-hero-cta {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      width: 100%;
      max-width: var(--landing-hero-measure);
      margin-top: 28px;
      padding-bottom: 6px;
      pointer-events: auto;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    /* Sphere CTA + “Choose visual” hide: _portal_nifty.css (#landing-root .menu .go-btn, .titles-container) */
"""

shell_body_pre_scripts = (
    r"""</style>
</head>
<body>
"""
    + landing_overlay_html
    + r"""  <div class="noise"></div>
  <div class="portal-main portal-main--behind-landing">

    <div class="frame marquee-bar">
      <div class="edge-l"></div>
      <div class="edge-r"></div>
      <div style="overflow:hidden;width:100%;height:100%;display:flex;align-items:center;padding:0 8px;">
        <div class="marquee-track">
          <span>Nocturnal Labs</span><span class="dot"></span><span>CYMATICS ENGINE</span><span class="dot"></span><span class="jp">नाद ब्रह्म</span><span class="dot"></span><span>BOOT SEQUENCE INITIATED</span><span class="dot"></span><span class="jp">द्वार</span><span class="dot"></span><span>PARTICLE MADNESS</span><span class="dot"></span><span>HEALING FREQUENCIES</span><span class="dot"></span><span class="jp">स्पन्दन</span><span class="dot"></span><span>NĀDA BRAHMA</span><span class="dot"></span>
          <span>Nocturnal Labs</span><span class="dot"></span><span>CYMATICS ENGINE</span><span class="dot"></span><span class="jp">नाद ब्रह्म</span><span class="dot"></span><span>BOOT SEQUENCE INITIATED</span><span class="dot"></span><span class="jp">द्वार</span><span class="dot"></span><span>PARTICLE MADNESS</span><span class="dot"></span><span>HEALING FREQUENCIES</span><span class="dot"></span><span class="jp">स्पन्दन</span><span class="dot"></span><span>NĀDA BRAHMA</span><span class="dot"></span>
        </div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="title-area">
      <h1>CYMATICS PORTAL</h1>
      <div class="sub">Nocturnal Labs x SomaTea · Sound is the creator · Nāda Brahma</div>
    </div>

    <div class="spacer"></div>

    <div class="frame marquee-bar">
      <div class="edge-l"></div>
      <div class="edge-r"></div>
      <div style="overflow:hidden;width:100%;height:100%;display:flex;align-items:center;padding:0 8px;">
        <div class="marquee-track marquee-rev">
          <span>PORTAL 1 <span class="marquee-of-infinity">OF <span class="marquee-infinity">∞</span></span></span><span class="dot"></span><span class="jp">द्वार</span><span class="dot"></span><span>Nocturnal Labs</span><span class="dot"></span><span>SOLFEGGIO 528 HZ</span><span class="dot"></span><span class="jp">आवृत्ति</span><span class="dot"></span><span>SACRED GEOMETRY</span><span class="dot"></span><span>AETHER CANVAS</span><span class="dot"></span><span class="jp">कम्पन</span><span class="dot"></span>
          <span>PORTAL 1 <span class="marquee-of-infinity">OF <span class="marquee-infinity">∞</span></span></span><span class="dot"></span><span class="jp">द्वार</span><span class="dot"></span><span>Nocturnal Labs</span><span class="dot"></span><span>SOLFEGGIO 528 HZ</span><span class="dot"></span><span class="jp">आवृत्ति</span><span class="dot"></span><span>SACRED GEOMETRY</span><span class="dot"></span><span>AETHER CANVAS</span><span class="dot"></span><span class="jp">कम्पन</span><span class="dot"></span>
        </div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="frame portal-section" id="portal-container">
      <div class="edge-l"></div>
      <div class="edge-r"></div>
      <div class="status-bar">
        <span class="jp-label">नाद ब्रह्म · CYMATICS</span>
        <span class="readout" id="readout">Particles: — · Drive Hz: — · Lobes ~—</span>
        <span style="display:flex;align-items:center;margin-left:auto;gap:10px;">
          <span>Nocturnal Labs · <span class="jp-label">द्वार</span></span>
          <button type="button" class="visual-fs-toggle" id="btnVisualFullscreen" aria-label="Fullscreen visual" aria-pressed="false" title="Fullscreen visual (ESC or click again to exit)">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
          </button>
        </span>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="frame">
      <div class="edge-l"></div>
      <div class="edge-r"></div>
      <div class="ctrl-frame">
        <div class="ctrl-col" id="pmFrequencyControlCol">
          <h3><span class="num">01</span> Sound & playback</h3>
          <div class="ctrl-row">
            <label for="modeSel">Audio Mode</label>
            <select id="modeSel">
              <option value="track" selected>Upload Track</option>
              <option value="preset">Healing Presets</option>
              <option value="manual">Manual tone</option>
            </select>
          </div>
          <div class="ctrl-row" id="presetRow" style="display:none;">
            <label for="presetSel">Presets</label>
            <select id="presetSel"></select>
          </div>
          <div class="ctrl-row">
            <label>Frequency 1 — 25&nbsp;000 Hz</label>
            <div class="freq-row">
              <input type="range" id="freqDial" min="1" max="25000" value="528" step="1">
              <input type="number" id="freqNum" min="1" max="25000" value="528" step="1">
            </div>
          </div>
          <div class="ctrl-row" id="trackRow" style="display:none;">
            <label for="fileIn">Audio file</label>
            <input type="file" id="fileIn" accept="audio/*">
          </div>
          <div class="ctrl-row btn-row audio-transport" title="Play starts or resumes audio (tone, preset, or track)">
            <button type="button" class="icon-btn" id="btnAudio" title="Play / start audio" aria-label="Play" aria-pressed="false">
              <svg class="icon-btn__svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
            </button>
            <button type="button" class="icon-btn" id="btnTrackPause" disabled title="Pause track" aria-label="Pause" aria-pressed="false">
              <svg class="icon-btn__svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
            </button>
            <button type="button" class="icon-btn" id="btnStop" title="Stop" aria-label="Stop" aria-pressed="false">
              <svg class="icon-btn__svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
            </button>
          </div>
          <div class="ctrl-row track-transport-panel" id="trackTransportRow" style="display:none;">
            <div class="transport-inner transport-inner--flat">
              <div class="transport-seek ctrl-row">
                <label for="trackSeekSlider">Track position</label>
                <input type="range" id="trackSeekSlider" min="0" max="0.001" value="0" step="any" disabled aria-label="Seek track">
              </div>
              <div class="track-time" id="trackTimeLabel" aria-live="polite">— / —</div>
            </div>
          </div>
          <div class="ctrl-row">
            <label for="volSlider">Volume</label>
            <input type="range" id="volSlider" min="0" max="100" value="35" step="1">
          </div>
        </div>
        <div class="ctrl-col" id="pmAudioEngineCol">
          <h3><span class="num">02</span> Advanced visuals</h3>
          <div class="ctrl-row">
            <label for="aggressionSel">Audio-Visualiser Portals</label>
            <select id="aggressionSel" title="Classic cymatics, Mandelbrot or Julia escape-time, or Julia wormhole tunnel with named fractal presets">
              <option value="balanced">Balanced — classic cymatics</option>
              <option value="fractalMB">Mandelbrot — escape-time</option>
              <option value="fractalJulia" selected>Julia — escape-time (wandering c)</option>
              <option value="juliaWH_rabbit">Douady Rabbit</option>
              <option value="juliaWH_dendrite">Dendrite</option>
              <option value="juliaWH_sanMarco">San Marco</option>
              <option value="juliaWH_siegel">Siegel Disc</option>
              <option value="juliaWH_recursive">Deep Recursive</option>
              <option value="juliaWH_spiral">Spiral</option>
              <option value="juliaWH_airplane">Airplane</option>
              <option value="juliaWH_cauliflower">Cauliflower</option>
              <option value="juliaWormhole">Julia wormhole — tunnel</option>
            </select>
          </div>
          <div class="ctrl-row">
            <label>Particle count (max <span id="particleCapLabel">—</span>)</label>
            <div class="freq-row">
              <input type="range" id="particleSlider" min="2500" max="320000" value="111111" step="500">
              <input type="number" id="particleNum" min="2500" max="320000" value="111111" step="500">
            </div>
          </div>
          <div class="advanced-controls-anchor">
            <div id="advancedControlsHost" class="advanced-controls-host"></div>
            <div id="wormholeControlsHost" class="advanced-controls-host advanced-controls-host--wormhole"></div>
          </div>
        </div>
        <div class="ctrl-col initiate-sequence-col">
          <h3><span class="num">03</span> Cymatics Portal &times; SomaTea</h3>
          <p class="initiate-prose">Cymatics Portal is a gateway back to the oldest truth humanity ever knew: that the universe is not built from matter, but from vibration. Across ancient civilizations&mdash;from the Vedic concept of Nada Brahma (&ldquo;the world is sound&rdquo;) to the Pythagorean belief in the &ldquo;music of the spheres&rdquo;&mdash;sound was understood as a living force that shapes consciousness and form.</p>
          <p class="initiate-prose">Modern cymatics reveals what the ancients intuited: frequency creates geometry, and geometry creates experience. This app bridges that lineage into the present moment, weaving healing sound frequencies with reactive visual intelligence.</p>
          <p class="initiate-prose">Each tone becomes a pattern, each pattern becomes a feeling, and each feeling becomes a step toward coherence.</p>
          <p class="initiate-prose">Cymatics Portal invites you to witness your inner world made visible, to let vibration guide you back into alignment, and to remember that you are not separate from the harmony&mdash;you are part of the song.</p>
          <blockquote class="initiate-quote">
            <p>&ldquo;If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.&rdquo;</p>
            <cite>Nikola Tesla</cite>
          </blockquote>
        </div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="frame">
      <div class="edge-l"></div>
      <div class="edge-r"></div>
      <div class="info-section">
        <div class="info-col">
          <h2>About the Portal</h2>
          <p>Cymatics Portal merges the Nāda Brahma frame system with the Particle Madness engine: particles on a disk read height from resonant mathematics, while Web Audio drives manual tones, healing presets, or full-track FFT.</p>
          <div class="arrows">&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</div>
        </div>
        <div class="info-col">
          <h2 class="gold">Nāda Brahma</h2>
          <p>Nāda Brahma — sound as primal vibration. The readout shows particle count, drive frequency, and approximate lobe count.</p>
          <div class="arrows">&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</div>
        </div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="frame marquee-bar">
      <div class="edge-l"></div>
      <div class="edge-r"></div>
      <div style="overflow:hidden;width:100%;height:100%;display:flex;align-items:center;padding:0 8px;">
        <div class="marquee-track marquee-bot">
          <span>PORTAL 1 <span class="marquee-of-infinity">OF <span class="marquee-infinity">∞</span></span></span><span class="dot"></span><span>MAIN DRIVE STATUS</span><span class="dot"></span><span class="jp">स्पन्दन</span><span class="dot"></span><span>CYMATICS PORTAL</span><span class="dot"></span><span class="jp">द्वार</span><span class="dot"></span><span>PARTICLE MADNESS</span><span class="dot"></span><span>Nocturnal Labs</span><span class="dot"></span>
          <span>PORTAL 1 <span class="marquee-of-infinity">OF <span class="marquee-infinity">∞</span></span></span><span class="dot"></span><span>MAIN DRIVE STATUS</span><span class="dot"></span><span class="jp">स्पन्दन</span><span class="dot"></span><span>CYMATICS PORTAL</span><span class="dot"></span><span class="jp">द्वार</span><span class="dot"></span><span>PARTICLE MADNESS</span><span class="dot"></span><span>Nocturnal Labs</span><span class="dot"></span>
        </div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="frame">
      <div class="edge-l"></div>
      <div class="edge-r"></div>
      <div class="footer-bar">
        <span>CYMATICS PORTAL 2026</span>
        <span class="sep"></span>
        <span>Nocturnal Labs</span>
        <span class="sep"></span>
        <span class="jp" style="opacity:0.7;">नाद ब्रह्म</span>
        <span class="sep"></span>
        <span class="footer-translit">Nāda Brahma</span>
      </div>
    </div>

    <div class="spacer"></div>
  </div>

  <script>
"""
)

landing_bridge_js = r"""
  </script>
  <script>window.__pmAssetPath = './landing/';</script>
  <script src="./landing/js/TweenMax.min.js"></script>
  <script>
  if (typeof TweenMax !== 'undefined') { window.__landingTweenMax = TweenMax; }
  </script>
  <script>
  window.demoList = [
    {
      id: 'cymatics',
      title: 'Cymatics',
      bgColor: '#030508',
      urls: { low: '#', medium: '#', high: '#' },
      colors: [0x00a8ff, 0xffb84d, 0x3d5cff, 0xff6ec7],
      speeds: [1.0, 0.0032, 0.7, 0.5, 3.0, 3.4]
    }
  ];
  </script>
  <script src="./landing/js/particle-landing.js"></script>
  <script>
(function() {
    /* Landing perf ingest: disabled by default. Use ?cpDebugPerf=1 to enable (loads extra RAF + POST /api/debug-ingest). */
    if (/[?&]cpDebugPerf=1(?:&|$)/.test(location.search || '')) (function () {
        /* Perf NDJSON → parent postMessage + optional same-origin POST /api/debug-ingest. */
        function _send(loc, hypothesisId, message, data) {
            var payload = {
                sessionId: '7e891a',
                runId: 'baseline',
                location: loc,
                hypothesisId: hypothesisId,
                message: message,
                data: data || {},
                timestamp: Date.now()
            };
            var body = JSON.stringify(payload);
            try {
                if (
                    window.parent !== window &&
                    window.location.origin &&
                    window.location.origin !== 'null'
                ) {
                    window.parent.postMessage(
                        {
                            type: 'cp-landing-perf',
                            sessionId: '7e891a',
                            envelope: payload
                        },
                        window.location.origin
                    );
                }
            } catch (_pm) {}
            // Same-origin fallback when Cymatics runs under `next dev` (writes workspace debug-7e891a.log via /api/debug-ingest).
            var _nwUrl = null;
            try {
                var _p = window.location && window.location.protocol;
                if (_p === 'http:' || _p === 'https:') {
                    _nwUrl = window.location.origin + '/api/debug-ingest';
                }
            } catch (_u) {}
            if (_nwUrl) {
                fetch(_nwUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Debug-Session-Id': '7e891a'
                    },
                    body: body,
                    credentials: 'same-origin',
                    keepalive: true
                })
                    .then(function (res) {
                        if (res.ok) return;
                        return res.text().then(function (txt) {
                            try {
                                console.warn(
                                    '[DEBUG-7e891a-ingest-http]',
                                    res.status,
                                    txt.slice(0, 200)
                                );
                            } catch (_) {}
                        });
                    })
                    .catch(function (err) {
                    try {
                        console.warn(
                            '[DEBUG-7e891a-local-ingest-fail]',
                            err && String(err.message)
                        );
                    } catch (_) {}
                });
            }
            // Verbose NDJSON mirror (DevTools Verbose/Debug level hides `debug` unless enabled).
            try {
                console.debug('[DEBUG-7e891a]', body);
            } catch (_) {}
        }
        try {
            _send('_build_portal:landing_bridge', 'H0', 'bridge_early', {
                skipLanding: document.documentElement.classList.contains('skip-landing'),
                hasLandingRoot: !!document.getElementById('landing-root'),
                inIframe: window.parent !== window
            });
        } catch (_) {}
        setTimeout(function () {
            try {
                var root = document.getElementById('landing-root');
                var qs = root && root.querySelector('.quality-selector');
                var cs = qs ? window.getComputedStyle(qs) : null;
                _send(
                    '_build_portal:landing_bridge',
                    'H1',
                    'post_quality_gate_dom',
                    {
                        qBtnCount: document.querySelectorAll('#landing-root .quality-btn').length,
                        qsDisplay: cs && cs.display,
                        qsVisibility: cs && cs.visibility,
                        qsOpacity: cs && cs.opacity,
                        qsPointerEvents: cs && cs.pointerEvents
                    }
                );
            } catch (eQ) {
                _send('_build_portal:landing_bridge', 'H1', 'post_quality_gate_err', {
                    err: String(eQ && eQ.message)
                });
            }
        }, 360);
        setTimeout(function () {
            try {
                var root = document.getElementById('landing-root');
                var cv = root && root.querySelector('canvas');
                var vv = typeof window.visualViewport !== 'undefined' ? window.visualViewport : null;
                var dpr = window.devicePixelRatio || 1;
                var cw = cv ? cv.clientWidth : 0;
                var ch = cv ? cv.clientHeight : 0;
                var bw = cv ? cv.width : 0;
                var bh = cv ? cv.height : 0;
                var expW = cw * dpr;
                var expH = ch * dpr;
                var n = 0;
                var tPrev = performance.now();
                var maxDt = 0;
                var sumDt = 0;
                function rafTick() {
                    var tNow = performance.now();
                    var dt = tNow - tPrev;
                    maxDt = Math.max(maxDt, dt);
                    sumDt += dt;
                    tPrev = tNow;
                    n += 1;
                    if (n < 41) requestAnimationFrame(rafTick);
                    else {
                        var avg = sumDt / 40;
                        _send('_build_portal:landing_bridge', 'H2', 'canvas_rafsample', {
                            dpr: dpr,
                            canvasClientW: cw,
                            canvasClientH: ch,
                            canvasBufferW: bw,
                            canvasBufferH: bh,
                            bufferOverClientWdpr:
                                cw > 0 ? bw / Math.max(expW, 1) : null,
                            bufferOverClientHdpr:
                                ch > 0 ? bh / Math.max(expH, 1) : null,
                            vw: vv ? vv.width : null,
                            vh: vv ? vv.height : null,
                            innerW: window.innerWidth,
                            innerH: window.innerHeight,
                            uaShort:
                                navigator.userAgent && navigator.userAgent.slice(0, 96),
                            cores: navigator.hardwareConcurrency || null
                        });
                        _send('_build_portal:landing_bridge', 'H3', 'raf_spacing', {
                            rafIntervals: 40,
                            avgMs: avg,
                            maxMs: maxDt,
                            approxFpsMedian: avg > 0 ? 1000 / avg : null
                        });
                    }
                }
                requestAnimationFrame(rafTick);
            } catch (eS) {
                _send('_build_portal:landing_bridge', 'H2+H3', 'canvas_raf_err', {
                    err: String(eS && eS.message)
                });
            }
        }, 420);
        try {
            _send('_build_portal:landing_bridge', 'H5', 'landing_env', {
                hasVisualViewport:
                    typeof window.visualViewport !== 'undefined' &&
                    !!window.visualViewport,
                prefersReducedMotion: (function () {
                    try {
                        return window.matchMedia(
                            '(prefers-reduced-motion: reduce)'
                        ).matches;
                    } catch (eM) {
                        return null;
                    }
                })()
            });
        } catch (eE) {}
    })();

    if (document.documentElement.classList.contains('skip-landing')) return;

    var landingRoot = document.getElementById('landing-root');
    if (!landingRoot) return;

    // ── 1. AUTO-SKIP QUALITY GATE ──
    /* Index 0 = Low (LANDING_PAGE_FIXES.md). Deferred click so async preload can attach handlers. */
    var qualityBtns = landingRoot.querySelectorAll('.quality-btn');
    if (qualityBtns.length >= 1) {
        window.setTimeout(function () {
            try {
                qualityBtns[0].click(); // Low
            } catch (_eQ) {}
        }, 100);
    }

    // ── 1b. Logo-only FLIP to compact corner (.landing-particle-om stays centred CSS; no coupled GSAP). ──
    (function compactLogoCorner() {
        var TM = typeof TweenMax !== 'undefined' ? TweenMax : window.__landingTweenMax;
        var heroMenu = landingRoot.querySelector('.menu');
        if (!heroMenu) return;

        var LOGO_CORNER_DURATION_S = 1.04; /* 0.8s baseline + ~30 pct slower */

        function heroWordingUnveiled() {
            try {
                var cs = window.getComputedStyle(heroMenu);
                if (cs.display === 'none') return false;
                if (cs.visibility === 'hidden') return false;
                return true;
            } catch (eM) {
                return false;
            }
        }

        var compactQueued = false;
        function queueCompact() {
            if (compactQueued) return;
            compactQueued = true;
            /* Same frame tick as first paint of hero strip (wording + menu fade start) */
            requestAnimationFrame(function () {
                requestAnimationFrame(runCompactFlip);
            });
        }

        function runCompactFlip() {
            var logo = landingRoot.querySelector('.logo');
            if (!logo || logo.getAttribute('data-cp-logo-compact') === '1') return;
            var guideLayer = document.getElementById('landing-guide');
            if (guideLayer && guideLayer.style.display === 'block') return;

            logo.setAttribute('data-cp-logo-compact', '1');

            if (!TM || typeof TM.killTweensOf !== 'function') {
                logo.classList.add('cp-logo-compact');
                return;
            }

            /* Particle engine tweens `.logo`; leftover inline transforms + CSS translate(-50%)
             * fights GSAP FLIP and reads as a horizontal jog before the corner tween. */
            TM.killTweensOf(logo);
            try {
                TM.set(logo, { clearProps: 'transform' });
            } catch (_eClr) {}

            /*
             * One paint after reset: centred layout is purely from CSS (~:not(.cp-logo-compact)).
             * Then invert and fromTo still in same task so no stray frame sees corner-only geometry.
             */
            requestAnimationFrame(function () {
                var first = logo.getBoundingClientRect();

                logo.classList.add('cp-logo-compact');
                void logo.offsetHeight;
                var last = logo.getBoundingClientRect();

                var dx =
                    first.left +
                    first.width / 2 -
                    (last.left + last.width / 2);
                var dy =
                    first.top +
                    first.height / 2 -
                    (last.top + last.height / 2);
                var s = Math.max(
                    0.0001,
                    Math.min(first.width / last.width, first.height / last.height)
                );

                TM.fromTo(
                    logo,
                    LOGO_CORNER_DURATION_S,
                    {
                        x: dx,
                        y: dy,
                        scale: s,
                        transformOrigin: '50% 50%',
                        immediateRender: true,
                        force3D: true
                    },
                    {
                        x: 0,
                        y: 0,
                        scale: 1,
                        transformOrigin: '50% 50%',
                        ease: 'easeInOutQuint',
                        onComplete: function () {
                            try {
                                TM.set(logo, { clearProps: 'transform' });
                            } catch (eCl) {}
                        }
                    }
                );
            });
        }

        var obs = new MutationObserver(function () {
            if (heroWordingUnveiled()) {
                queueCompact();
                obs.disconnect();
            }
        });
        obs.observe(heroMenu, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        var tries = 0;
        var pol = window.setInterval(function () {
            tries += 1;
            if (heroWordingUnveiled() || tries >= 130) {
                window.clearInterval(pol);
                obs.disconnect();
                if (heroWordingUnveiled()) queueCompact();
            }
        }, 100);

        window.setTimeout(function () {
            try {
                window.clearInterval(pol);
            } catch (eI) {}
            obs.disconnect();
            if (heroWordingUnveiled()) queueCompact();
        }, 12000);
    })();

    // ── 2. OVERRIDE GO BUTTON → SHOW GUIDE ──
    var origGo = landingRoot.querySelector('.go-btn');
    var guide = document.getElementById('landing-guide');

    if (origGo && guide) {
        var newGo = origGo.cloneNode(true);
        origGo.parentNode.replaceChild(newGo, origGo);

        newGo.addEventListener('click', function() {
            landingRoot.classList.add('cp-landing-guide-open');
            var menu = landingRoot.querySelector('.menu');
            if (menu) {
                TweenMax.to(menu, 0.6, {
                    opacity: 0,
                    y: -30,
                    ease: 'easeInQuint',
                    onComplete: function() { menu.style.display = 'none'; }
                });
            }

            var logo = landingRoot.querySelector('.logo');
            if (logo) {
                TweenMax.to(logo, 0.5, { opacity: 0 });
            }

            guide.style.display = 'block';
            TweenMax.fromTo(guide, 0.8,
                { opacity: 0 },
                { opacity: 1, ease: 'easeInOutCubic' }
            );
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage(
                        { type: 'cp-action', action: 'guide-opened' },
                        window.location.origin || '*'
                    );
                }
            } catch (_g1) {}
        });
    }

    // ── 3. ENTER PORTAL → DISMISS LANDING ──
    var enterBtn = document.getElementById('enter-portal-btn');
    if (enterBtn) {
        enterBtn.addEventListener('click', function() {
            TweenMax.to(landingRoot, 0.8, {
                opacity: 0,
                ease: 'easeInCubic',
                onComplete: function() {
                    landingRoot.style.display = 'none';

                    var portalMain = document.querySelector('.portal-main');
                    if (portalMain) {
                        portalMain.classList.remove('portal-main--behind-landing');
                    }

                    try {
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage(
                                { type: 'cp-action', action: 'portal-reached' },
                                window.location.origin || '*'
                            );
                        }
                    } catch (ePr) {}

                    window.dispatchEvent(new Event('resize'));

                }
            });
        });
    }
})();
  </script>
  <script>
  (function () {
    window.addEventListener('message', function (ev) {
      try {
        if (ev.source !== window.parent) return;
        if (!ev.data || ev.data.type !== 'cp-shell' || ev.data.action !== 'nav-back') return;
      } catch (e0) {
        return;
      }
      var TM = typeof TweenMax !== 'undefined' ? TweenMax : window.__landingTweenMax;
      var landingRoot = document.getElementById('landing-root');
      var guide = document.getElementById('landing-guide');
      var menu = landingRoot && landingRoot.querySelector('.menu');
      var portalMain = document.querySelector('.portal-main');
      if (!landingRoot || !guide) return;

      try {
        if (typeof window.__pmVisualFullscreenExit === 'function') {
          window.__pmVisualFullscreenExit();
        }
      } catch (_cpFsExit) {}

      if (TM) {
        try {
          TweenMax.killTweensOf(landingRoot);
        } catch (_klr) {}
        try {
          TweenMax.killTweensOf(guide);
        } catch (_kg) {}
        if (menu) {
          try {
            TweenMax.killTweensOf(menu);
          } catch (_km0) {}
        }
      }

      var lrHidden = false;
      try {
        lrHidden = window.getComputedStyle(landingRoot).display === 'none';
      } catch (eC) {
        lrHidden = landingRoot.style.display === 'none';
      }

      if (lrHidden) {
        try {
          document.documentElement.classList.remove('skip-landing');
        } catch (_sk) {}
        if (TM) {
          try {
            TweenMax.set(landingRoot, { clearProps: 'opacity,transform' });
          } catch (_clr) {}
        }
        landingRoot.style.display = '';
        landingRoot.style.opacity = '1';
        if (portalMain) portalMain.classList.add('portal-main--behind-landing');
        landingRoot.classList.add('cp-landing-guide-open');
        if (menu) {
          menu.style.display = 'none';
          menu.style.opacity = '0';
          menu.style.visibility = 'hidden';
        }
        guide.style.display = 'block';
        guide.style.opacity = '1';
        guide.style.visibility = 'visible';
        var logo = landingRoot.querySelector('.logo');
        if (logo) {
          if (TM) {
            try {
              TweenMax.killTweensOf(logo);
            } catch (_klg) {}
            try {
              TM.set(logo, { opacity: 1, clearProps: 'transform' });
            } catch (_l1) {
              logo.style.opacity = '1';
            }
          } else {
            logo.style.opacity = '1';
          }
        }
        try {
          if (window.parent !== window) {
            window.parent.postMessage(
              { type: 'cp-action', action: 'guide-opened' },
              window.location.origin || '*'
            );
          }
        } catch (e1) {}
        try {
          window.dispatchEvent(new Event('resize'));
        } catch (_r) {}
        return;
      }

      var guideShown = false;
      try {
        guideShown = window.getComputedStyle(guide).display !== 'none';
      } catch (_gs) {
        guideShown = guide.style.display === 'block';
      }
      if (landingRoot.classList.contains('cp-landing-guide-open') && guideShown) {
        landingRoot.classList.remove('cp-landing-guide-open');
        if (TM) {
          try {
            TweenMax.killTweensOf(guide);
          } catch (_kg1) {}
          TweenMax.to(guide, 0.35, {
            opacity: 0,
            ease: 'easeInCubic',
            onComplete: function () {
              guide.style.display = 'none';
              guide.style.visibility = 'hidden';
            }
          });
        } else {
          guide.style.opacity = '0';
          guide.style.display = 'none';
          guide.style.visibility = 'hidden';
        }
        /* landing.css uses display:none on .menu; clearing inline style leaves it hidden. */
        if (menu) {
          if (TM) {
            try {
              TweenMax.killTweensOf(menu);
            } catch (_km) {}
            try {
              TweenMax.set(menu, { clearProps: 'transform,opacity' });
            } catch (_sm) {}
          }
          menu.style.display = 'block';
          menu.style.visibility = 'visible';
          menu.style.opacity = '0';
          if (TM) {
            TweenMax.fromTo(
              menu,
              0.45,
              { opacity: 0, y: -8 },
              { opacity: 1, y: 0, ease: 'easeOutCubic', delay: 0.05 }
            );
          } else {
            menu.style.opacity = '1';
          }
        }
        var logo2 = landingRoot.querySelector('.logo');
        if (logo2) {
          if (TM) {
            try {
              TweenMax.killTweensOf(logo2);
            } catch (_kl) {}
            try {
              TweenMax.set(logo2, { clearProps: 'transform' });
            } catch (_cs) {}
            TweenMax.to(logo2, 0.4, { opacity: 1, delay: 0.02 });
          } else {
            logo2.style.opacity = '1';
          }
        }
        try {
          if (window.parent !== window) {
            window.parent.postMessage(
              { type: 'cp-action', action: 'guide-closed' },
              window.location.origin || '*'
            );
          }
        } catch (e2) {}
        try {
          window.dispatchEvent(new Event('resize'));
        } catch (_r2) {}
      }
    });
  })();
  </script>
  <script>
(function () {
    function __cpPostPortalReached() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(
                    { type: 'cp-action', action: 'portal-reached' },
                    window.location.origin || '*'
                );
            }
        } catch (e) {}
    }
    if (!document.documentElement.classList.contains('skip-landing')) return;
    if (document.readyState === 'complete') {
        __cpPostPortalReached();
    } else {
        window.addEventListener('load', __cpPostPortalReached);
    }
})();
  </script>
  <script>
"""

datgui_js = datgui.read_text(encoding="utf-8")
portal_ctrl_js = portal_ctrl_panels.read_text(encoding="utf-8")
visual_fullscreen_js = visual_fullscreen_ui.read_text(encoding="utf-8")

final = (
    shell_head
    + portal_css
    + shell_body_pre_scripts
    + datgui_js
    + portal_ctrl_js
    + visual_fullscreen_js
    + landing_bridge_js
    + iife2
    + "\n  </script>\n</body>\n</html>\n"
)

out_path = root / "index.html"
out_path.write_text(final, encoding="utf-8")
write_seo_sidecar_files(root, _ORIGIN)
if not skin_path.exists():
    css_m2 = re.search(r"<style>\s*([\s\S]*?)\s*</style>", final)
    if css_m2:
        skin_path.write_text(css_m2.group(1).strip() + "\n", encoding="utf-8")
print("Wrote", out_path, "bytes", out_path.stat().st_size)
