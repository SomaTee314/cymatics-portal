'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { tunnelStore } from '@/tunnel/tunnelStore';
import { loadOmTexture } from '@/visuals/loadOmTexture';
import { framedSkyFragment, framedSkyVertex } from '@/visuals/shaders/framedSkyShader';
import {
  wormholeFragment,
  wormholeVertex,
} from '@/visuals/shaders/juliaWormholeShaders';

const PALETTE = [
  new THREE.Color('#ff4da8'),
  new THREE.Color('#8e3bff'),
  new THREE.Color('#3b7bff'),
  new THREE.Color('#4dffb0'),
  new THREE.Color('#f5ff61'),
];

/**
 * Full-viewport Three.js wormhole — Interstellar-style infinite flythrough.
 *
 * Architecture:
 *   • 72 Julia-textured rings receding into Z-distance
 *   • 3 helical neon strands twisting through the cylinder
 *   • 2400 neon Om billboard glyphs streaming through the tunnel (instanced quads)
 *   • Full-screen framed Julia quad as backdrop (screen-space, camera-independent)
 *   • UnrealBloom postprocessing for haloed light-bending feel
 *
 * Camera stays at (0,0,0). The world moves toward the camera as `depth`
 * grows. Rings/particles recycle when they pass the camera, giving
 * mathematically infinite forward flight regardless of how high `depth`
 * climbs. With `idleForward` set, the camera drifts forward continuously
 * even without scroll input.
 */
export function JuliaWormholeBackdrop(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initial = tunnelStore.getState();
    const TUNNEL_LENGTH = initial.ringCount * initial.ringSpacing;
    const particleCount = initial.particleCount;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, initial.fogDensity);

    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 0);

    const makeMat = (idx: number, mode: 0 | 1, zoom = 1.6, intensity = 1.0) =>
      new THREE.ShaderMaterial({
        vertexShader: wormholeVertex,
        fragmentShader: wormholeFragment,
        transparent: mode === 0,
        blending: mode === 0 ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: mode === 1,
        side: mode === 1 ? THREE.BackSide : THREE.DoubleSide,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uDepth: { value: 0 },
          uIndex: { value: idx },
          uZoom: { value: zoom },
          uIntensity: { value: intensity },
          uCenter: { value: new THREE.Vector2(initial.juliaCx, initial.juliaCy) },
          uDiscRadius: { value: initial.discRadius },
          uMode: { value: mode },
          uFractalEvolutionSpeed: { value: initial.fractalEvolutionSpeed },
        },
      });

    const skyMat = new THREE.ShaderMaterial({
      vertexShader: framedSkyVertex,
      fragmentShader: framedSkyFragment,
      depthTest: false,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uDepth: { value: 0 },
        uZoom: { value: initial.juliaFrameZoom },
        uIntensity: { value: 1.05 },
        uCenter: { value: new THREE.Vector2(initial.juliaCx, initial.juliaCy) },
        uDiscRadius: { value: initial.discRadius },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uPulseAmount: { value: initial.juliaPulseAmount },
        uPulseSpeed: { value: 0.4 },
        uParallaxAmount: { value: initial.juliaParallaxAmount },
        uRotationSpeed: { value: initial.juliaRotationSpeed },
        uRidgeStrength: { value: initial.juliaRidgeStrength },
        uFractalEvolutionSpeed: { value: initial.fractalEvolutionSpeed },
      },
    });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -1; // render before everything else
    scene.add(sky);

    const rings: THREE.Mesh[] = [];
    const ringMats: THREE.ShaderMaterial[] = [];
    for (let i = 0; i < initial.ringCount; i++) {
      const mat = makeMat(i, 0, 1.4 + (i % 5) * 0.12, 1.0);
      ringMats.push(mat);
      const geo = new THREE.RingGeometry(initial.ringRadius * 0.81, initial.ringRadius, 80, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = -i * initial.ringSpacing;
      mesh.rotation.z = (i * 0.41) % (Math.PI * 2);
      mesh.userData.spin = 0.18 + (i % 7) * 0.022;
      rings.push(mesh);
      scene.add(mesh);
    }

    const helices: THREE.Mesh[] = [];
    for (let h = 0; h < initial.helixCount; h++) {
      const phaseOffset = (h / initial.helixCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const HELIX_PTS = 900;
      const HELIX_TWISTS = 6;
      for (let i = 0; i <= HELIX_PTS; i++) {
        const t = i / HELIX_PTS;
        const z = -t * TUNNEL_LENGTH;
        const radius = initial.ringRadius * 0.78 + Math.sin(t * 18) * 0.4;
        const angle = phaseOffset + t * Math.PI * 2 * HELIX_TWISTS;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tube = new THREE.TubeGeometry(curve, HELIX_PTS, 0.06, 8, false);
      const colour = PALETTE[h % PALETTE.length]!;
      const mat = new THREE.MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: true,
      });
      const mesh = new THREE.Mesh(tube, mat);
      mesh.userData.basePhase = phaseOffset;
      mesh.userData.baseColor = colour.clone();
      helices.push(mesh);
      scene.add(mesh);
    }

    // --- Neon Om billboards (same motion as former sphere particles) ---
    let omGlyphs: THREE.InstancedMesh | undefined;
    let cancelled = false;

    const pPos = new Float32Array(particleCount * 3);
    const pPh = new Float32Array(particleCount);
    const pScale = new Float32Array(particleCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * initial.ringRadius * 0.95;
      const z = -Math.random() * TUNNEL_LENGTH;
      pPos[i * 3] = Math.cos(theta) * r;
      pPos[i * 3 + 1] = Math.sin(theta) * r;
      pPos[i * 3 + 2] = z;
      pPh[i] = Math.random() * Math.PI * 2;
      pScale[i] = 0.6 + Math.random() * 0.8;
    }

    void loadOmTexture('/om-neon.png')
      .then((map) => {
        if (cancelled) {
          map.dispose();
          return;
        }
        const aspect = map.image.height / map.image.width;
        const baseW = 0.24;
        const omGeo = new THREE.PlaneGeometry(baseW, baseW * aspect);
        const omMat = new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          premultipliedAlpha: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          fog: true,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.InstancedMesh(omGeo, omMat, particleCount);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        for (let i = 0; i < particleCount; i++) {
          dummy.position.set(pPos[i * 3]!, pPos[i * 3 + 1]!, pPos[i * 3 + 2]!);
          dummy.scale.setScalar(pScale[i]!);
          dummy.lookAt(camera.position);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        omGlyphs = mesh;
        scene.add(mesh);
      })
      .catch((err) => {
        console.error('[JuliaWormholeBackdrop] Om texture failed:', err);
      });
    // ---

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      initial.bloomStrength,
      initial.bloomRadius,
      initial.bloomThreshold,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    let resizePending = false;
    const onResize = () => {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        skyMat.uniforms.uResolution.value.set(w, h);
        resizePending = false;
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // performance.now() based dt (better than THREE.Clock for visibility-pause handling)
    let lastT = performance.now();
    let elapsed = 0;
    let raf = 0;
    /** Last store depth — Om stream uses Δdepth so motion matches fractal / ring evolution (same `depth` as uDepth). */
    let prevDepth = initial.depth;
    /** World Z per unit depth (tuned so Δdepth ≈ v·dt ⇒ ~same speed as former v·dt·12). */
    const OM_DEPTH_TO_Z = 12;
    /** |Δdepth| above this ⇒ depth jump (Home/End); use velocity fallback so Oms don't streak. */
    const OM_MAX_DEPTH_DELTA = TUNNEL_LENGTH * 3;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      elapsed += dt;
      const time = elapsed;
      const s = tunnelStore.getState();

      for (const ring of rings) {
        const relZ = ring.position.z + s.depth;
        if (relZ > 5) ring.position.z -= TUNNEL_LENGTH;
        else if (relZ < -TUNNEL_LENGTH + 5) ring.position.z += TUNNEL_LENGTH;
        const distFactor = THREE.MathUtils.clamp(-relZ / TUNNEL_LENGTH, 0, 1);
        const spinRate =
          (ring.userData.spin as number) * (0.6 + distFactor * 1.8) + s.velocity * 0.04;
        ring.rotation.z += spinRate * dt;
      }

      for (const m of ringMats) {
        m.uniforms.uTime.value = time;
        m.uniforms.uDepth.value = s.depth;
        m.uniforms.uFractalEvolutionSpeed.value = s.fractalEvolutionSpeed;
        m.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
        m.uniforms.uDiscRadius.value = s.discRadius;
      }
      skyMat.uniforms.uTime.value = time * 0.4;
      skyMat.uniforms.uDepth.value = s.depth * 0.05;
      skyMat.uniforms.uFractalEvolutionSpeed.value = s.fractalEvolutionSpeed;
      skyMat.uniforms.uCenter.value.set(s.juliaCx, s.juliaCy);
      skyMat.uniforms.uDiscRadius.value = s.discRadius;
      skyMat.uniforms.uZoom.value = s.juliaFrameZoom;
      skyMat.uniforms.uPulseAmount.value = s.juliaPulseAmount;
      skyMat.uniforms.uParallaxAmount.value = s.juliaParallaxAmount;
      skyMat.uniforms.uRotationSpeed.value = s.juliaRotationSpeed;
      skyMat.uniforms.uRidgeStrength.value = s.juliaRidgeStrength;

      for (const h of helices) {
        h.rotation.z = time * 0.18 + (h.userData.basePhase as number) * 0.3 + s.depth * 0.04;
        // Velocity-driven flare: scale color into HDR (toneMapped: false) so bloom catches it
        const flare = Math.min(Math.abs(s.velocity) * s.helixFlareGain, 2.5);
        const hm = h.material as THREE.MeshBasicMaterial;
        const baseColor = h.userData.baseColor as THREE.Color;
        hm.color.copy(baseColor).multiplyScalar(1 + flare);
        hm.opacity = Math.min(0.85 + flare * 0.15, 1.0);
      }

      const dDepth = s.depth - prevDepth;
      prevDepth = s.depth;
      const dzOm =
        (!Number.isFinite(dDepth) || Math.abs(dDepth) > OM_MAX_DEPTH_DELTA
          ? s.velocity * dt * OM_DEPTH_TO_Z
          : dDepth * OM_DEPTH_TO_Z) * s.omStreamSpeed;

      if (omGlyphs) {
        for (let i = 0; i < particleCount; i++) {
          pPos[i * 3 + 2] += dzOm;
          if (pPos[i * 3 + 2]! > 5) pPos[i * 3 + 2]! -= TUNNEL_LENGTH;
          else if (pPos[i * 3 + 2]! < -TUNNEL_LENGTH + 5) pPos[i * 3 + 2]! += TUNNEL_LENGTH;
          const x = pPos[i * 3]!;
          const y = pPos[i * 3 + 1]!;
          const angSpeed = 0.04 + pPh[i]! * 0.002;
          const cs = Math.cos(angSpeed * dt);
          const sn = Math.sin(angSpeed * dt);
          pPos[i * 3] = x * cs - y * sn;
          pPos[i * 3 + 1] = x * sn + y * cs;

          dummy.position.set(pPos[i * 3]!, pPos[i * 3 + 1]!, pPos[i * 3 + 2]!);
          dummy.scale.setScalar(pScale[i]!);
          dummy.lookAt(camera.position);
          dummy.updateMatrix();
          omGlyphs.setMatrixAt(i, dummy.matrix);
        }
        omGlyphs.instanceMatrix.needsUpdate = true;
      }

      bloom.strength = s.bloomStrength;
      bloom.radius = s.bloomRadius;
      bloom.threshold = s.bloomThreshold;

      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = s.fogDensity;
      }

      composer.render(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        // Reset dt clock so we don't process a giant catch-up frame
        lastT = performance.now();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      cancelled = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVis);
      composer.dispose();
      for (const r of rings) {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      }
      for (const h of helices) {
        h.geometry.dispose();
        (h.material as THREE.Material).dispose();
      }
      if (omGlyphs) {
        omGlyphs.geometry.dispose();
        const mat = omGlyphs.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
      skyMat.dispose();
      sky.geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen"
      aria-hidden
    />
  );
}
