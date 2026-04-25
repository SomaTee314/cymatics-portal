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
    }
