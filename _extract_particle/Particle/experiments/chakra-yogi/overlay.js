/**
 * Interactive yogi particle layer — separated from index.js background.
 * Tuned for readability over a busy particle field + dat.GUI master controls.
 */
(function () {
    var SRC = './experiments/chakra-yogi/yogi-overlay.png';

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function hexToRgb01(hex) {
        if (hex && typeof hex === 'object' && typeof hex.r === 'number') {
            return [hex.r / 255, hex.g / 255, hex.b / 255];
        }
        if (Array.isArray(hex) && hex.length >= 3) {
            return [hex[0] / 255, hex[1] / 255, hex[2] / 255];
        }
        var h = String(hex || '#ffffff').replace('#', '');
        if (h.length === 3) {
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        if (h.length !== 6) return [1, 1, 1];
        return [
            parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255
        ];
    }

    /** Vertex band 0 = crown (image top) … 6 = root (image bottom) */
    var CHAKRA_KEYS = [
        'chakraCrown',
        'chakraThirdEye',
        'chakraThroat',
        'chakraHeart',
        'chakraSolar',
        'chakraSacral',
        'chakraRoot'
    ];

    function classify(r, g, b) {
        var L = (r + g + b) / (3 * 255);
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var sat = max > 0 ? (max - min) / max : 0;
        if (r < 26 && g < 26 && b < 26) return 'silhouette';
        if (sat > 0.1 || L > 0.4) return 'keep';
        if (r < 70 && g < 85 && b > 35 && b >= r * 0.85) return 'bg';
        if (L < 0.14 && sat < 0.1) return 'bg';
        return 'keep';
    }

    function particleGoal() {
        var m = window.location.hash.match(/yogiParticles=(\d+)/i);
        var n = m ? parseInt(m[1], 10) : 16000;
        return Math.min(52000, Math.max(4000, n));
    }

    var controls = {
        /** One knob: scales size, brightness, and motion snap together */
        yogiMaster: 1.15,
        masterIntensity: 1.35,
        pointerSharpness: 28,
        repel: 4.2,
        swirl: 2.4,
        radius: 0.5,
        spring: 5.8,
        velocityDamping: 0.965,
        curlStrength: 0.038,
        flowSpeed: 1.15,
        depthWobble: 0.014,
        cameraParallax: 0.055,
        zoomSensitivity: 0.00055,
        basePointSize: 0.014,
        particleOpacity: 1,
        colorVibrance: 1.35,
        silhouetteLift: 0.82,
        fogDensity: 0.006,
        figureScale: 1.22,
        samplingSharpness: 1,
        useNormalBlending: true,
        chakraPaletteMix: 0.72,
        chakraCrown: '#b967ff',
        chakraThirdEye: '#5c6cff',
        chakraThroat: '#2ad0ff',
        chakraHeart: '#00e676',
        chakraSolar: '#ffea00',
        chakraSacral: '#ff7043',
        chakraRoot: '#ff1744',
        gainR: 1,
        gainG: 1,
        gainB: 1,
        rebuild: function () {
            if (lastSourceImage) buildParticles(lastSourceImage);
        },
        resetYogi: function () {
            controls.yogiMaster = 1.15;
            controls.basePointSize = 0.014;
            controls.particleOpacity = 1;
            controls.colorVibrance = 1.35;
            controls.silhouetteLift = 0.82;
            controls.fogDensity = 0.006;
            controls.figureScale = 1.22;
            controls.masterIntensity = 1.35;
            controls.curlStrength = 0.038;
            controls.repel = 4.2;
            controls.swirl = 2.4;
            controls.spring = 5.8;
            controls.chakraPaletteMix = 0.72;
            controls.chakraCrown = '#b967ff';
            controls.chakraThirdEye = '#5c6cff';
            controls.chakraThroat = '#2ad0ff';
            controls.chakraHeart = '#00e676';
            controls.chakraSolar = '#ffea00';
            controls.chakraSacral = '#ff7043';
            controls.chakraRoot = '#ff1744';
            controls.gainR = 1;
            controls.gainG = 1;
            controls.gainB = 1;
            refreshAllGui(gui);
            syncMaterialFromControls();
            syncFogFromControls();
            if (lastSourceImage) buildParticles(lastSourceImage);
        }
    };

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    camera.position.z = 2.35;

    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        premultipliedAlpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    var wrap = document.querySelector('.ui');
    if (!wrap) return;
    renderer.domElement.className = 'chakra-yogi-particles-canvas';
    wrap.appendChild(renderer.domElement);

    var mouse = new THREE.Vector2(0, 0);
    var mouseSm = new THREE.Vector2(0, 0);
    var scrollZoom = 0;

    var _unproj = new THREE.Vector3();
    var _dir = new THREE.Vector3();
    var mouseWorld = new THREE.Vector3(0, 0, 0);

    var pointsMaterial = null;
    var pointsMesh = null;
    var geom = null;
    var basePos = null;
    var vel = null;
    var colorAttr = null;
    var chakraBandAttr = null;
    var baseColors = null;
    var clock = new THREE.Clock();
    var lastSourceImage = null;
    var gui = null;

    function refreshAllGui(g) {
        if (!g) return;
        var i;
        for (i = 0; i < g.__controllers.length; i++) g.__controllers[i].updateDisplay();
        for (var name in g.__folders) refreshAllGui(g.__folders[name]);
    }

    function syncMaterialFromControls() {
        if (!pointsMaterial) return;
        var m = controls.yogiMaster;
        pointsMaterial.size = controls.basePointSize * m;
        pointsMaterial.opacity = Math.min(1, controls.particleOpacity * (0.85 + 0.15 * m));
        pointsMaterial.blending = controls.useNormalBlending ? THREE.NormalBlending : THREE.AdditiveBlending;
        pointsMaterial.depthWrite = false;
        pointsMaterial.depthTest = false;
        var v = Math.min(1.85, controls.colorVibrance * (0.75 + 0.35 * m));
        pointsMaterial.color.setRGB(v, v, v);
        pointsMaterial.needsUpdate = true;
        applyColorTintToBuffer();
    }

    function syncFogFromControls() {
        var d = controls.fogDensity * (1.1 - 0.25 * controls.yogiMaster);
        if (d < 0) d = 0;
        if (!scene.fog) scene.fog = new THREE.FogExp2(0x060a14, d);
        else scene.fog.density = d;
    }

    function applyColorTintToBuffer() {
        if (!colorAttr || !baseColors) return;
        var out = colorAttr.array;
        var src = baseColors;
        var lift = controls.silhouetteLift;
        var vib = controls.colorVibrance * (0.9 + 0.2 * controls.yogiMaster);
        for (var i = 0; i < out.length; i += 3) {
            var r = src[i];
            var g = src[i + 1];
            var b = src[i + 2];
            var L = 0.299 * r + 0.587 * g + 0.114 * b;
            if (L < 0.22) {
                r += (0.62 - r) * lift;
                g += (0.58 - g) * lift;
                b += (0.98 - b) * lift;
            }
            out[i] = Math.min(1, r * vib);
            out[i + 1] = Math.min(1, g * vib);
            out[i + 2] = Math.min(1, b * vib);

            var vi = i / 3;
            var band = chakraBandAttr
                ? Math.min(6, Math.max(0, chakraBandAttr.array[vi] | 0))
                : 0;
            var ck = CHAKRA_KEYS[band];
            var tcBand = hexToRgb01(controls[ck]);
            var mix = Math.max(0, Math.min(1, controls.chakraPaletteMix));
            var kR = controls.gainR;
            var kG = controls.gainG;
            var kB = controls.gainB;
            var mr = lerp(1, tcBand[0] * 1.55, mix) * kR;
            var mg = lerp(1, tcBand[1] * 1.55, mix) * kG;
            var mb = lerp(1, tcBand[2] * 1.55, mix) * kB;
            out[i] = Math.min(1, out[i] * mr);
            out[i + 1] = Math.min(1, out[i + 1] * mg);
            out[i + 2] = Math.min(1, out[i + 2] * mb);
        }
        colorAttr.needsUpdate = true;
    }

    function setupGui() {
        if (typeof dat === 'undefined') return;
        if (gui) return;
        gui = new dat.GUI({ width: 318, autoPlace: false });

        var attachOpts = { title: 'Chakra Yogi', initialLeft: 8, initialTop: 12, zIndex: 450 };

        var fMaster = gui.addFolder('Yogi master');
        fMaster.add(controls, 'yogiMaster', 0.35, 2).name('presence (all)').onChange(function () {
            syncMaterialFromControls();
        });
        fMaster.add(controls, 'resetYogi').name('reset yogi defaults');
        fMaster.open();

        var fCol = gui.addFolder('Yogi particle colours (7 chakras)');
        fCol.add(controls, 'chakraPaletteMix', 0, 1).name('palette strength').onChange(syncMaterialFromControls);
        fCol.addColor(controls, 'chakraCrown').name('crown — top').onChange(syncMaterialFromControls);
        fCol.addColor(controls, 'chakraThirdEye').name('third eye').onChange(syncMaterialFromControls);
        fCol.addColor(controls, 'chakraThroat').name('throat').onChange(syncMaterialFromControls);
        fCol.addColor(controls, 'chakraHeart').name('heart').onChange(syncMaterialFromControls);
        fCol.addColor(controls, 'chakraSolar').name('solar plexus').onChange(syncMaterialFromControls);
        fCol.addColor(controls, 'chakraSacral').name('sacral').onChange(syncMaterialFromControls);
        fCol.addColor(controls, 'chakraRoot').name('root — base').onChange(syncMaterialFromControls);
        fCol.add(controls, 'gainR', 0.2, 2.5).name('all: red gain').onChange(syncMaterialFromControls);
        fCol.add(controls, 'gainG', 0.2, 2.5).name('all: green gain').onChange(syncMaterialFromControls);
        fCol.add(controls, 'gainB', 0.2, 2.5).name('all: blue gain').onChange(syncMaterialFromControls);
        fCol.open();

        var fDef = gui.addFolder('Definition & read');
        fDef.add(controls, 'basePointSize', 0.004, 0.032).name('point size').onChange(syncMaterialFromControls);
        fDef.add(controls, 'particleOpacity', 0.35, 1).name('opacity').onChange(syncMaterialFromControls);
        fDef.add(controls, 'colorVibrance', 0.6, 2.2).name('color vibrance').onChange(syncMaterialFromControls);
        fDef.add(controls, 'silhouetteLift', 0, 1).name('silhouette glow').onChange(syncMaterialFromControls);
        fDef.add(controls, 'fogDensity', 0, 0.055).name('yogi fog').onChange(syncFogFromControls);
        fDef.add(controls, 'useNormalBlending').name('solid blend (not add)').onChange(syncMaterialFromControls);
        fDef.add(controls, 'figureScale', 0.85, 1.65).name('figure scale').onChange(function () {
            if (lastSourceImage) buildParticles(lastSourceImage);
        });
        fDef.add(controls, 'samplingSharpness', 0.65, 1.35).name('edge density').onChange(function () {
            if (lastSourceImage) buildParticles(lastSourceImage);
        });
        fDef.add(controls, 'rebuild').name('rebuild particles');
        fDef.open();

        var fMot = gui.addFolder('Motion (interaction)');
        fMot.add(controls, 'masterIntensity', 0.2, 3).name('motion intensity');
        fMot.add(controls, 'pointerSharpness', 4, 48).name('pointer snap');
        fMot.add(controls, 'repel', 0.2, 12);
        fMot.add(controls, 'swirl', 0, 8);
        fMot.add(controls, 'radius', 0.15, 1.2).name('pointer radius');
        fMot.add(controls, 'spring', 0.5, 14);
        fMot.add(controls, 'velocityDamping', 0.85, 0.995).name('velocity keep');
        fMot.open();

        var fFlow = gui.addFolder('Ambient flow');
        fFlow.add(controls, 'curlStrength', 0, 0.12).name('curl');
        fFlow.add(controls, 'flowSpeed', 0, 3);
        fFlow.add(controls, 'depthWobble', 0, 0.045).name('depth ripple');
        fFlow.open();

        var fCam = gui.addFolder('Camera (yogi layer)');
        fCam.add(controls, 'cameraParallax', 0, 0.2).name('parallax');
        fCam.add(controls, 'zoomSensitivity', 0.0001, 0.002).name('scroll zoom');
        fCam.open();

        if (typeof attachMovableDatGui === 'function') {
            attachMovableDatGui(gui, attachOpts);
        } else {
            document.body.appendChild(gui.domElement);
            gui.domElement.style.cssText = 'position:fixed;top:12px;left:8px;right:auto;z-index:450;';
        }

        window.addEventListener('keydown', function (e) {
            if (e.key === 'y' || e.key === 'Y') {
                if (gui.__pmDatGuiToggleVisibility) gui.__pmDatGuiToggleVisibility();
                else gui.domElement.style.display = gui.domElement.style.display === 'none' ? '' : 'none';
            }
        });
    }

    function onPointer(e) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });

    window.addEventListener('wheel', function (e) {
        scrollZoom += e.deltaY * controls.zoomSensitivity;
        scrollZoom = Math.max(-0.9, Math.min(1.2, scrollZoom));
    }, { passive: true });

    function resize() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, true);
    }
    window.addEventListener('resize', resize);
    resize();

    function updateMouseWorld(ndcX, ndcY) {
        _unproj.set(ndcX, ndcY, 0.5);
        _unproj.unproject(camera);
        _dir.copy(_unproj).sub(camera.position).normalize();
        var t = -camera.position.z / _dir.z;
        if (t > 0 && isFinite(t)) {
            mouseWorld.copy(camera.position).add(_dir.multiplyScalar(t));
        } else {
            mouseWorld.set(ndcX * 1.85, ndcY * 1.85, 0);
        }
    }

    function cellType(data, w, h, ix, iy) {
        var i = (iy * w + ix) * 4;
        return classify(data[i], data[i + 1], data[i + 2]);
    }

    function buildParticles(img) {
        if (pointsMesh) {
            scene.remove(pointsMesh);
            if (pointsMesh.geometry) pointsMesh.geometry.dispose();
            if (pointsMesh.material) pointsMesh.material.dispose();
            pointsMesh = null;
        }

        var goal = particleGoal();
        var w = Math.round(320 * controls.samplingSharpness);
        w = Math.max(260, Math.min(440, w));
        var h = img ? Math.max(32, Math.round(img.height * (w / img.width))) : 400;
        var canvas2d = document.createElement('canvas');
        canvas2d.width = w;
        canvas2d.height = h;
        var ctx = canvas2d.getContext('2d');
        if (img) {
            ctx.drawImage(img, 0, 0, w, h);
        } else {
            ctx.fillStyle = '#1a3050';
            ctx.fillRect(0, 0, w, h);
        }
        var im = ctx.getImageData(0, 0, w, h);
        var data = im.data;

        function lumAt(ix, iy) {
            var i = (iy * w + ix) * 4;
            return (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        }

        var sc = controls.figureScale;
        var aspectImg = w / h;
        var spanX = aspectImg * 1.18 * sc;
        var spanY = 1.18 * sc;

        var pos = [];
        var col = [];
        var bandList = [];

        var tries = 0;
        var maxTries = goal * 150;
        var sk = controls.samplingSharpness;

        while (pos.length / 3 < goal && tries < maxTries) {
            tries++;
            var ix = Math.floor(Math.random() * w);
            var iy = Math.floor(Math.random() * h);
            if (cellType(data, w, h, ix, iy) === 'bg') continue;

            var L = lumAt(ix, iy);
            var edgeBias = sk;
            if (L < 0.14) {
                if (Math.random() > 0.32 * edgeBias) continue;
            } else if (L < 0.05 + Math.random() * 0.22) continue;

            var nx = (ix / w - 0.5) * spanX;
            var ny = -(iy / h - 0.5) * spanY;
            var j = 0.0038 * (1 - Math.min(L, 0.95));
            pos.push(nx + (Math.random() - 0.5) * j, ny + (Math.random() - 0.5) * j, (Math.random() - 0.5) * 0.022);

            var i = (iy * w + ix) * 4;
            var r = data[i] / 255;
            var g = data[i + 1] / 255;
            var b = data[i + 2] / 255;

            if (L < 0.11) {
                r = 0.38 + r * 0.35;
                g = 0.35 + g * 0.32;
                b = 0.82 + b * 0.15;
            } else {
                var boost = 0.35 + L * 1.05;
                r = Math.min(1, r * boost + 0.12);
                g = Math.min(1, g * boost + 0.1);
                b = Math.min(1, b * boost + 0.14);
            }

            col.push(r, g, b);
            var band = Math.min(6, Math.floor((iy / Math.max(1, h - 1)) * 7));
            bandList.push(band);
        }

        basePos = new Float32Array(pos);
        vel = new Float32Array(pos.length);
        baseColors = new Float32Array(col);

        geom = new THREE.BufferGeometry();
        geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
        var colBuf = new Float32Array(col);
        geom.addAttribute('color', new THREE.BufferAttribute(colBuf, 3));
        colorAttr = geom.attributes.color;
        geom.addAttribute('chakraBand', new THREE.BufferAttribute(new Float32Array(bandList), 1));
        chakraBandAttr = geom.attributes.chakraBand;

        pointsMaterial = new THREE.PointsMaterial({
            size: controls.basePointSize * controls.yogiMaster,
            vertexColors: THREE.VertexColors,
            color: new THREE.Color(1, 1, 1),
            transparent: true,
            opacity: controls.particleOpacity,
            blending: controls.useNormalBlending ? THREE.NormalBlending : THREE.AdditiveBlending,
            // Slightly crisp dots vs background haze
            sizeAttenuation: true,
            depthWrite: false,
            depthTest: false
        });

        pointsMesh = new THREE.Points(geom, pointsMaterial);
        scene.add(pointsMesh);

        if (!scene.fog) scene.fog = new THREE.FogExp2(0x060a14, controls.fogDensity);
        else scene.fog.density = controls.fogDensity;

        syncMaterialFromControls();
        syncFogFromControls();
        if (gui) refreshAllGui(gui);
    }

    function curl2(px, py, time) {
        var s = 2.1;
        return {
            x: Math.sin(py * s + time * 0.9) * Math.cos(px * s * 0.7 - time * 0.45),
            y: Math.sin(px * s - time * 0.7) * Math.cos(py * 0.8 * s + time * 0.35)
        };
    }

    var animStarted = false;
    function animate() {
        requestAnimationFrame(animate);
        var dt = Math.min(clock.getDelta(), 0.08);
        var aud = (window.__pmReactiveAudio && window.__pmReactiveAudio.getDrive)
            ? window.__pmReactiveAudio.getDrive(clock.getElapsedTime())
            : { intensity: 1, curl: 1, flow: 1 };
        var t = clock.getElapsedTime() * controls.flowSpeed * aud.flow;

        var sharp = controls.pointerSharpness;
        var ease = 1 - Math.exp(-sharp * dt);
        mouseSm.x += (mouse.x - mouseSm.x) * ease;
        mouseSm.y += (mouse.y - mouseSm.y) * ease;
        updateMouseWorld(mouseSm.x, mouseSm.y);

        var zTarget = 2.35 - scrollZoom * 0.85;
        camera.position.z += (zTarget - camera.position.z) * (0.08 + dt * 4);
        var par = controls.cameraParallax;
        camera.position.x = mouseSm.x * par;
        camera.position.y = mouseSm.y * par * 0.92;
        camera.lookAt(scene.position);

        if (geom && geom.attributes.position && basePos && vel) {
            var arr = geom.attributes.position.array;
            var mx = mouseWorld.x;
            var my = mouseWorld.y;
            var mi = controls.masterIntensity * controls.yogiMaster * aud.intensity;
            var pushRadius = controls.radius;
            var pushRadiusSq = pushRadius * pushRadius;
            var repel = controls.repel * mi;
            var swirl = controls.swirl * mi;
            var spring = controls.spring;
            var damp = Math.pow(controls.velocityDamping, dt * 60);

            for (var i = 0; i < arr.length; i += 3) {
                var bx = basePos[i];
                var by = basePos[i + 1];
                var bz = basePos[i + 2];

                var px = arr[i];
                var py = arr[i + 1];
                var pz = arr[i + 2];

                var dxm = px - mx;
                var dym = py - my;
                var distSq = dxm * dxm + dym * dym + 0.00008;

                var fx = 0;
                var fy = 0;
                var fz = 0;

                if (distSq < pushRadiusSq) {
                    var inv = 1 / distSq;
                    var falloff = (pushRadiusSq - distSq) / pushRadiusSq;
                    var push = repel * falloff * falloff * inv * 0.085;
                    fx += dxm * push;
                    fy += dym * push;
                    var invLen = 1 / Math.sqrt(distSq);
                    fx += (-dym * invLen) * swirl * falloff * 0.14;
                    fy += (dxm * invLen) * swirl * falloff * 0.14;
                }

                var c = curl2(bx * 3.2, by * 3.2, t);
                var curl = controls.curlStrength * mi * aud.curl;
                fx += c.x * curl;
                fy += c.y * curl;

                fx += (bx - px) * spring;
                fy += (by - py) * spring;
                fz += (bz + controls.depthWobble * Math.sin(t * 1.8 + bx * 5 + by * 3) - pz) * (spring * 0.68);

                vel[i] = (vel[i] + fx * dt) * damp;
                vel[i + 1] = (vel[i + 1] + fy * dt) * damp;
                vel[i + 2] = (vel[i + 2] + fz * dt) * damp;

                arr[i] += vel[i];
                arr[i + 1] += vel[i + 1];
                arr[i + 2] += vel[i + 2];
            }
            geom.attributes.position.needsUpdate = true;
        }

        renderer.render(scene, camera);
    }

    var loader = new THREE.TextureLoader();
    loader.load(
        SRC,
        function (tex) {
            lastSourceImage = tex.image;
            buildParticles(lastSourceImage);
            setupGui();
            if (!animStarted) {
                animStarted = true;
                animate();
            }
        },
        undefined,
        function () {
            lastSourceImage = null;
            buildParticles(null);
            setupGui();
            if (!animStarted) {
                animStarted = true;
                animate();
            }
        }
    );
})();
