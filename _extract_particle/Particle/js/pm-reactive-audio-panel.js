/**
 * Cymatics-parity reactive audio for Particle Madness experiments (non-Cymatics pages).
 * Exposes window.__pmReactiveAudio.getDrive() for use in animation loops.
 */
(function () {
    var PRESETS = [
        { name: '— Choose preset —', hz: 0 },
        { name: 'Solfeggio 174 Hz', hz: 174 },
        { name: 'Solfeggio 285 Hz', hz: 285 },
        { name: 'Solfeggio 396 Hz', hz: 396 },
        { name: 'Solfeggio 417 Hz', hz: 417 },
        { name: 'Solfeggio 432 Hz', hz: 432 },
        { name: 'Solfeggio 528 Hz', hz: 528 },
        { name: 'Solfeggio 639 Hz', hz: 639 },
        { name: 'Solfeggio 741 Hz', hz: 741 },
        { name: 'Solfeggio 852 Hz', hz: 852 },
        { name: 'Solfeggio 963 Hz', hz: 963 },
        { name: 'Schumann ~7.83 Hz', hz: 7.83 },
        { name: '40 Hz (gamma)', hz: 40 },
        { name: 'A4 concert 440 Hz', hz: 440 },
        { name: '1000 Hz', hz: 1000 }
    ];

    var sim = {
        motionGain: 1.12,
        fftSmoothing: 0.22,
        trackBlend: 0.12,
        centroidBlend: 0.58,
        trackHzSpeed: 1.25,
        fluxDecay: 0.88,
        bandSnap: 0.95,
        rmsWeight: 1.05,
        spectralLevelWeight: 1,
        transientGain: 1.1,
        beatPunch: 1.15
    };

    var audioCtx = null;
    var osc = null;
    var oscGain = null;
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
    var started = false;

    var shell, modeSel, presetSel, freqDial, freqNum, trackRow, presetRow;
    var volSlider, fileIn, btnAudio, btnStop, readout;

    function injectStyles() {
        if (document.getElementById('pm-ra-styles')) return;
        var st = document.createElement('style');
        st.id = 'pm-ra-styles';
        st.textContent =
            '#pm-ra-shell{position:fixed;left:12px;top:12px;max-width:min(340px,92vw);max-height:calc(100vh - 24px);z-index:90;display:flex;flex-direction:column;' +
            'background:rgba(8,14,28,.92);border:1px solid rgba(80,160,255,.25);border-radius:10px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.45);backdrop-filter:blur(8px);' +
            'color:#c8e8ff;font-family:system-ui,Segoe UI,sans-serif;font-size:12px;}' +
            '#pm-ra-header{flex-shrink:0;display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:grab;user-select:none;' +
            'background:linear-gradient(180deg,rgba(18,32,58,.98),rgba(10,20,40,.95));border-bottom:1px solid rgba(80,160,255,.22);color:#7ecbff;}' +
            '#pm-ra-title{flex:1;font-size:13px;font-weight:600;letter-spacing:.04em;}' +
            '#pm-ra-min{flex:0 0 auto;width:28px;height:26px;padding:0;border-radius:6px;border:1px solid rgba(100,180,255,.4);' +
            'background:linear-gradient(180deg,#1a3a62,#122842);color:#dff2ff;cursor:pointer;font-size:16px;line-height:1;}' +
            '#pm-ra-shell.pm-ra-min #pm-ra-panel{display:none}#pm-ra-shell.pm-ra-min{max-height:none}' +
            '#pm-ra-panel{padding:10px 12px 12px;overflow-y:auto;flex:1 1 auto;min-height:0;-webkit-overflow-scrolling:touch;}' +
            '#pm-ra-restore{display:none;position:fixed;left:12px;bottom:12px;z-index:250;padding:8px 14px;font-size:11px;' +
            'border-radius:6px;border:1px solid rgba(100,180,255,.4);background:linear-gradient(180deg,#153050,#0d1e38);color:#dff2ff;cursor:pointer;}' +
            '.pm-ra-row{margin-bottom:8px}.pm-ra-row label{display:block;margin-bottom:3px;opacity:.85;font-size:10px;text-transform:uppercase;letter-spacing:.06em;}' +
            '#pm-ra-shell select,#pm-ra-shell input[type=number],#pm-ra-shell input[type=file]{width:100%;box-sizing:border-box;padding:6px;border-radius:6px;' +
            'border:1px solid rgba(100,180,255,.35);background:#0a1224;color:#e8f4ff;font-size:12px;}' +
            '#pm-ra-shell input[type=range]{width:100%;accent-color:#3db8ff;}' +
            '.pm-ra-freq{display:flex;gap:6px;align-items:center}.pm-ra-freq input[type=number]{width:76px;flex-shrink:0}' +
            '.pm-ra-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}' +
            '#pm-ra-shell button{padding:7px 12px;border-radius:6px;border:1px solid rgba(100,180,255,.4);' +
            'background:linear-gradient(180deg,#153050,#0d1e38);color:#dff2ff;cursor:pointer;font-size:11px;}' +
            '#pm-ra-readout{font-variant-numeric:tabular-nums;font-size:11px;color:#ffd77a;margin-top:6px;line-height:1.4}' +
            '.pm-ra-hint{margin-top:8px;font-size:9px;opacity:.52;line-height:1.35}';
        document.head.appendChild(st);
    }

    function injectDOM() {
        if (document.getElementById('pm-ra-shell')) return;
        injectStyles();
        shell = document.createElement('div');
        shell.id = 'pm-ra-shell';
        shell.innerHTML =
            '<div id="pm-ra-header" title="Drag to move">' +
            '<span style="opacity:.45;font-size:11px">⋮⋮</span>' +
            '<span id="pm-ra-title">Particle audio</span>' +
            '<button type="button" id="pm-ra-min" aria-label="Minimise">−</button></div>' +
            '<div id="pm-ra-panel">' +
            '<div class="pm-ra-row"><label>Mode</label><select id="pm-ra-mode">' +
            '<option value="manual">Manual tone (dial)</option>' +
            '<option value="preset">Healing preset</option>' +
            '<option value="track">Uploaded track (FFT)</option></select></div>' +
            '<div class="pm-ra-row" id="pm-ra-preset-row"><label>Presets</label><select id="pm-ra-preset"></select></div>' +
            '<div class="pm-ra-row"><label>Frequency 1–25k Hz</label><div class="pm-ra-freq">' +
            '<input type="range" id="pm-ra-freq" min="1" max="25000" value="528" step="1">' +
            '<input type="number" id="pm-ra-freq-num" min="1" max="25000" value="528" step="1"></div></div>' +
            '<div class="pm-ra-row" id="pm-ra-track-row" style="display:none"><label>Audio file</label><input type="file" id="pm-ra-file" accept="audio/*"></div>' +
            '<div class="pm-ra-row"><label>Output volume</label><input type="range" id="pm-ra-vol" min="0" max="100" value="35" step="1"></div>' +
            '<div class="pm-ra-btns">' +
            '<button type="button" id="pm-ra-audio">Start / resume audio</button>' +
            '<button type="button" id="pm-ra-stop">Stop tone / track</button></div>' +
            '<div id="pm-ra-readout">Audio idle — press Start after choosing mode.</div>' +
            '<div class="pm-ra-hint">Matches Cymatics: manual sine, presets, or file-driven FFT. Panel is draggable; − minimises.</div></div>';
        document.body.appendChild(shell);
        var restore = document.createElement('button');
        restore.id = 'pm-ra-restore';
        restore.type = 'button';
        restore.textContent = 'Show audio panel';
        document.body.appendChild(restore);

        modeSel = document.getElementById('pm-ra-mode');
        presetSel = document.getElementById('pm-ra-preset');
        freqDial = document.getElementById('pm-ra-freq');
        freqNum = document.getElementById('pm-ra-freq-num');
        trackRow = document.getElementById('pm-ra-track-row');
        presetRow = document.getElementById('pm-ra-preset-row');
        volSlider = document.getElementById('pm-ra-vol');
        fileIn = document.getElementById('pm-ra-file');
        btnAudio = document.getElementById('pm-ra-audio');
        btnStop = document.getElementById('pm-ra-stop');
        readout = document.getElementById('pm-ra-readout');

        PRESETS.forEach(function (p, i) {
            var o = document.createElement('option');
            o.value = String(i);
            o.textContent = p.name;
            presetSel.appendChild(o);
        });

        var minimized = false;
        document.getElementById('pm-ra-min').addEventListener('click', function (e) {
            e.stopPropagation();
            minimized = !minimized;
            shell.classList.toggle('pm-ra-min', minimized);
            e.target.textContent = minimized ? '+' : '−';
        });
        restore.addEventListener('click', function () {
            shell.style.display = 'flex';
            restore.style.display = 'none';
        });
        var header = document.getElementById('pm-ra-header');
        (function drag() {
            var dragging = false;
            var sx, sy, ox, oy;
            function onMove(e) {
                if (!dragging) return;
                shell.style.left = Math.round(ox + e.clientX - sx) + 'px';
                shell.style.top = Math.round(oy + e.clientY - sy) + 'px';
                shell.style.right = 'auto';
            }
            function onUp() {
                dragging = false;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            }
            header.addEventListener('mousedown', function (e) {
                if (e.target.id === 'pm-ra-min') return;
                dragging = true;
                sx = e.clientX;
                sy = e.clientY;
                var r = shell.getBoundingClientRect();
                ox = r.left;
                oy = r.top;
                shell.style.left = ox + 'px';
                shell.style.top = oy + 'px';
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
                e.preventDefault();
            });
        })();

        modeSel.addEventListener('change', function () {
            var m = modeSel.value;
            trackRow.style.display = m === 'track' ? '' : 'none';
            presetRow.style.display = m === 'preset' ? '' : 'none';
            if (m !== 'preset') presetSel.selectedIndex = 0;
            restartAudioForMode();
        });
        presetSel.addEventListener('change', function () {
            var p = PRESETS[parseInt(presetSel.value, 10) || 0];
            if (p && p.hz > 0) {
                freqDial.value = String(Math.round(Math.min(25000, Math.max(1, p.hz))));
                syncFreqFromDial();
            }
            onFreqUiChange();
        });
        freqDial.addEventListener('input', function () { syncFreqFromDial(); onFreqUiChange(); });
        freqNum.addEventListener('change', function () { syncDialFromNum(); onFreqUiChange(); });
        volSlider.addEventListener('input', function () {
            var g = getVolume();
            if (oscGain) oscGain.gain.value = g * 0.22;
            if (mediaEl) mediaEl.volume = Math.min(1, g);
        });
        btnAudio.addEventListener('click', onStartClick);
        btnStop.addEventListener('click', onStopClick);
        fileIn.addEventListener('change', onFileChange);
    }

    function hzFromDialSafe() {
        if (!freqDial) return 528;
        return Math.max(1, Math.min(25000, parseInt(freqDial.value, 10) || 528));
    }

    function getVolume() {
        if (!volSlider) return 0.35;
        return (parseInt(volSlider.value, 10) || 0) / 100;
    }

    function ensureCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function syncFreqFromDial() {
        var v = Math.max(1, Math.min(25000, parseInt(freqDial.value, 10) || 1));
        freqDial.value = String(v);
        freqNum.value = String(v);
        return v;
    }
    function syncDialFromNum() {
        var v = Math.max(1, Math.min(25000, parseInt(freqNum.value, 10) || 1));
        freqNum.value = String(v);
        freqDial.value = String(v);
        return v;
    }
    function hzFromDial() {
        return hzFromDialSafe();
    }

    function stopOsc() {
        if (osc) {
            try { osc.stop(); } catch (e) {}
            try { osc.disconnect(); } catch (e2) {}
            osc = null;
        }
        if (oscGain) {
            try { oscGain.disconnect(); } catch (e3) {}
            oscGain = null;
        }
        if (toneAnalyser) {
            try { toneAnalyser.disconnect(); } catch (e4) {}
            toneAnalyser = null;
        }
        toneTimeData = null;
    }

    function stopTrack() {
        if (mediaEl) {
            mediaEl.pause();
            mediaEl.src = '';
            if (trackObjectUrl) {
                URL.revokeObjectURL(trackObjectUrl);
                trackObjectUrl = null;
            }
            mediaEl = null;
        }
        if (mediaSourceNode) {
            try { mediaSourceNode.disconnect(); } catch (e) {}
            mediaSourceNode = null;
        }
        if (analyser) {
            try { analyser.disconnect(); } catch (e2) {}
            analyser = null;
        }
        fftArray = null;
        timeDomainData = null;
        prevFftSum = 0;
        transientSm = 0;
    }

    function killAllAudio() {
        stopOsc();
        stopTrack();
    }

    function startOscillatorAtHz(hz) {
        ensureCtx();
        stopOsc();
        stopTrack();
        osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = Math.max(1, Math.min(20000, hz));
        oscGain = audioCtx.createGain();
        oscGain.gain.value = getVolume() * 0.22;
        toneAnalyser = audioCtx.createAnalyser();
        toneAnalyser.fftSize = 1024;
        toneAnalyser.smoothingTimeConstant = 0.55;
        toneTimeData = new Uint8Array(toneAnalyser.fftSize);
        osc.connect(oscGain).connect(toneAnalyser).connect(audioCtx.destination);
        osc.start();
        if (audioCtx.state === 'suspended' && audioCtx.resume) {
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

    function hzFromBin(peakI, peak) {
        if (!fftArray || !audioCtx) return hzFromDial();
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
            if (hz < 90) { sub += v; cSub++; }
            else if (hz < 280) { bass += v; cBass++; }
            else if (hz < 900) { lowMid += v; cLm++; }
            else if (hz < 2800) { mid += v; cMid++; }
            else if (hz < 9000) { high += v; cHi++; }
            else { treble += v; cTr++; }
        }
        var avg = function (s0, c) { return c > 0 ? (s0 / c) / 255 : 0; };
        var bSub = avg(sub, cSub);
        var bBass = avg(bass, cBass);
        var bLm = avg(lowMid, cLm);
        var bMid = avg(mid, cMid);
        var bHi = avg(high, cHi);
        var bTr = avg(treble, cTr);

        var peakHz = hzFromBin(peakI, peak);
        var centroid = centroidDen > 0.5 ? centroidNum / centroidDen : peakHz;
        centroid = Math.max(1, Math.min(25000, centroid));

        var alpha = Math.max(0.06, Math.min(0.62, (0.58 - sim.fftSmoothing * 0.95) * sim.trackHzSpeed));
        smoothDomFreq += (peakHz - smoothDomFreq) * alpha;
        smoothCentroid += (centroid - smoothCentroid) * alpha;

        var blendC = Math.max(0, Math.min(1, sim.centroidBlend));
        var combinedHz = smoothCentroid * blendC + smoothDomFreq * (1 - blendC);

        var flux = Math.max(0, sum - prevFftSum);
        prevFftSum = prevFftSum * sim.fluxDecay + sum * (1 - sim.fluxDecay);
        transientSm = transientSm * 0.76 + Math.min(1, flux / Math.max(18, sim.transientGain * n * 0.035)) * 0.24;

        var rms = 0;
        if (timeDomainData) {
            analyser.getByteTimeDomainData(timeDomainData);
            for (i = 0; i < timeDomainData.length; i++) {
                var x = (timeDomainData[i] - 128) / 128;
                rms += x * x;
            }
            rms = Math.sqrt(rms / timeDomainData.length);
        }

        var bAlpha = Math.min(0.52, 0.12 + sim.bandSnap * 0.34);
        bandSmooth.sub += (bSub - bandSmooth.sub) * bAlpha;
        bandSmooth.bass += (bBass - bandSmooth.bass) * bAlpha;
        bandSmooth.lowMid += (bLm - bandSmooth.lowMid) * bAlpha;
        bandSmooth.mid += (bMid - bandSmooth.mid) * bAlpha;
        bandSmooth.high += (bHi - bandSmooth.high) * bAlpha;
        bandSmooth.treble += (bTr - bandSmooth.treble) * bAlpha;

        var level = Math.min(1.85,
            rms * 4.2 * sim.rmsWeight +
            (sum / (n * 38)) * sim.spectralLevelWeight +
            transientSm * sim.beatPunch * 0.45
        );

        return {
            hz: combinedHz,
            peakHz: smoothDomFreq,
            centroid: smoothCentroid,
            level: level,
            transient: transientSm,
            rms: rms,
            bands: {
                sub: bandSmooth.sub,
                bass: bandSmooth.bass,
                lowMid: bandSmooth.lowMid,
                mid: bandSmooth.mid,
                high: bandSmooth.high,
                treble: bandSmooth.treble
            }
        };
    }

    function restartAudioForMode() {
        killAllAudio();
        var v = syncFreqFromDial();
        if (!started) return;
        if (modeSel.value === 'manual' || modeSel.value === 'preset') {
            startOscillatorAtHz(v);
        }
    }

    function onFreqUiChange() {
        var hz = syncFreqFromDial();
        if (audioCtx && osc && (modeSel.value === 'manual' || modeSel.value === 'preset')) {
            osc.frequency.value = Math.max(1, Math.min(20000, hz));
        }
        if (oscGain) oscGain.gain.value = getVolume() * 0.22;
    }

    function onStartClick() {
        injectDOM();
        var ctx = ensureCtx();
        var resume = function () {
            started = true;
            var hz = syncFreqFromDial();
            if (modeSel.value === 'manual' || modeSel.value === 'preset') {
                startOscillatorAtHz(hz);
            } else if (modeSel.value === 'track') {
                if (!mediaEl || !mediaEl.src) {
                    readout.textContent = 'Choose an audio file first.';
                    started = false;
                    return;
                }
                var playTry = mediaEl.play();
                if (playTry && typeof playTry.catch === 'function') {
                    playTry.catch(function () {
                        readout.textContent = 'Playback blocked — click Start again.';
                        started = false;
                    });
                }
            }
        };
        if (ctx.state === 'suspended' && ctx.resume) {
            var p = ctx.resume();
            if (p && typeof p.then === 'function') p.then(resume).catch(resume);
            else resume();
        } else resume();
    }

    function onStopClick() {
        if (modeSel.value === 'track' && mediaEl && mediaEl.src) {
            mediaEl.pause();
            stopOsc();
            started = false;
            return;
        }
        killAllAudio();
        started = false;
    }

    function onFileChange() {
        injectDOM();
        var f = fileIn.files && fileIn.files[0];
        killAllAudio();
        started = false;
        if (!f) return;
        ensureCtx();
        if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
        trackObjectUrl = URL.createObjectURL(f);
        mediaEl = new Audio();
        mediaEl.crossOrigin = 'anonymous';
        mediaEl.src = trackObjectUrl;
        mediaEl.volume = getVolume();
        mediaSourceNode = audioCtx.createMediaElementSource(mediaEl);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0.38;
        mediaSourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        fftArray = new Uint8Array(analyser.frequencyBinCount);
        timeDomainData = new Uint8Array(analyser.fftSize);
        smoothDomFreq = hzFromDial();
    }

    function getSnapshot(time) {
        var mode = modeSel ? modeSel.value : 'manual';
        var emptyBands = { sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, treble: 0 };
        var t = typeof time === 'number' ? time : 0;
        var hz;
        var level = 0.35 + 0.25 * Math.sin(t * 0.7);
        var snap = {
            hz: hzFromDial(),
            peakHz: hzFromDial(),
            centroid: hzFromDial(),
            level: level,
            transient: 0,
            rms: 0,
            bands: emptyBands
        };

        if (!started) {
            return { started: false, mode: mode, hz: hzFromDial(), level: 0.25, transient: 0, rms: 0, bands: emptyBands };
        }

        if (mode === 'track' && analyser && mediaEl && fftArray && !mediaEl.paused) {
            var a = analyzeTrackAudio();
            if (a) snap = a;
            hz = snap.hz;
            level = snap.level;
        } else if (mode === 'track') {
            hz = hzFromDial();
            level = 0.22 + 0.12 * Math.sin(t * 0.6);
            snap.hz = hz;
            snap.level = level;
        } else if (mode === 'preset') {
            var pi = parseInt(presetSel.value, 10) || 0;
            hz = PRESETS[pi].hz > 0 ? PRESETS[pi].hz : hzFromDial();
            level = Math.min(1, getVolume() * 1.4);
            snap.hz = hz;
            snap.level = level;
            snap.rms = readToneAnalyserRms();
            snap.bands = snap.bands || emptyBands;
        } else {
            hz = hzFromDial();
            level = Math.min(1, getVolume() * 1.4);
            snap.hz = hz;
            snap.level = level;
            snap.rms = readToneAnalyserRms();
            snap.bands = snap.bands || emptyBands;
        }
        var bias = Math.max(0, Math.min(1, sim.trackBlend));
        if (mode === 'track') {
            hz = hz * (1 - bias) + hzFromDial() * bias;
            snap.hz = hz;
        }
        hz = Math.max(1, Math.min(25000, hz));
        level = Math.max(0.08, Math.min(2.2, level * sim.motionGain));
        snap.level = level;
        snap.started = true;
        snap.mode = mode;
        snap.hz = hz;
        if (!snap.bands) snap.bands = emptyBands;
        return snap;
    }

    function getDrive(time) {
        injectDOM();
        var snap = getSnapshot(time);
        if (!snap.started) {
            return { intensity: 1, curl: 1, flow: 1, hz: snap.hz, transient: 0, level: 0 };
        }
        var tr = snap.transient || 0;
        var lv = snap.level || 0;
        var intensity = 1 + Math.min(1.15, lv * 0.48 + tr * 0.38);
        var b = snap.bands || {};
        var curl = 1 + (b.bass || 0) * 0.62 + (b.mid || 0) * 0.28 + tr * 0.22;
        var hzNorm = Math.log(Math.max(40, snap.hz) / 40) / Math.log(500 / 40);
        var flow = 1 + lv * 0.1 + (hzNorm - 0.5) * 0.06;
        flow = Math.max(0.72, Math.min(1.38, flow));
        return { intensity: intensity, curl: curl, flow: flow, hz: snap.hz, transient: tr, level: lv };
    }

    function boot() {
        injectDOM();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.__pmReactiveAudio = {
        getSnapshot: getSnapshot,
        getDrive: getDrive,
        _sim: sim
    };
})();
