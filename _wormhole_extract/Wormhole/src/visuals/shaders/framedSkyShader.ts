/**
 * Screen-space framed Julia shader — banded coloring ported from the
 * Cymatics Portal `juliaFractalFrag` shader.
 *
 * The "ridges" are produced by `fract(spiralPhase)` where the spiral
 * phase is composed of:
 *   - log-radial backbone (lr0 * 0.48) — concentric bands, always on
 *   - angular harmonics (2x, 4x) — twist bands into spiral arms,
 *     scaled by uRidgeStrength
 *   - escape-orbit phase — fractal embroidery from escape dynamics,
 *     scaled by uRidgeStrength
 *
 * The IQ pastel palette is kept (the brand look). Cymatics' 3x hue
 * multiplier is approximated by passing `t * 3.0` to the palette,
 * giving multiple color cycles per band.
 *
 * uRidgeStrength controls the WAVE DEFORMATION AMOUNT only:
 *   0 → pure concentric bands (rings expanding from focal point)
 *   1 → full Cymatics deformation (spirals + fractal embroidery)
 */

export const framedSkyVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`;

export const framedSkyFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uDepth;
uniform float uZoom;
uniform float uIntensity;
uniform vec2 uCenter;
uniform float uDiscRadius;
uniform vec2 uResolution;
uniform float uPulseAmount;
uniform float uPulseSpeed;
uniform float uParallaxAmount;
uniform float uRotationSpeed;
uniform float uRidgeStrength;
uniform float uFractalEvolutionSpeed;

// IQ pastel palette
vec3 palette(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.55);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.28318530718 * (c * t + d));
}

// Continuous half-angle atan2 — verbatim from juliaFractalFrag.
float juliaAngleCont(float zx, float zy) {
  float rh = length(vec2(zx, zy));
  if (rh < 1e-7) return 0.0;
  return 2.0 * atan(zy, zx + rh + 1e-7);
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  if (aspect >= 1.0) p.x *= aspect;
  else p.y /= aspect;

  float dEv = uDepth * uFractalEvolutionSpeed;

  // Slow rotation
  float rot = uTime * uRotationSpeed + dEv * 0.03;
  float cR = cos(rot);
  float sR = sin(rot);
  p = mat2(cR, -sR, sR, cR) * p;

  // Pulse zoom + parallax morph
  float pulsePhasor = sin(uTime * uPulseSpeed);
  float effectiveZoom = uZoom * (1.0 + pulsePhasor * uPulseAmount);
  vec2 z0 = p / max(effectiveZoom, 1e-3);

  float ph1 = uTime * 0.13 + dEv * 0.15;
  float ph2 = uTime * 0.17 + dEv * 0.13;
  vec2 c = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));

  float parallaxAngle = uTime * 0.07 + dEv * 0.04;
  c += vec2(cos(parallaxAngle), sin(parallaxAngle)) * pulsePhasor * uParallaxAmount;

  // Iterate
  const int MAX_ITERS = 384;
  const float B = 256.0;
  vec2 z = z0;
  float m2 = dot(z, z);
  float n = 0.0;
  for (int i = 0; i < MAX_ITERS; i++) {
    if (m2 > B * B) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m2 = dot(z, z);
    n += 1.0;
  }
  float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;
  float escaped = step(B * B, m2);

  // ============================================================
  // CYMATICS SPIRAL-PHASE BANDING
  // ============================================================
  // Time/depth-driven phase signals
  float paletteOffset = uTime * 0.24 + dEv * 0.12;
  float spiralPhase   = uTime * 0.18 + dEv * 0.10;

  // ---- Initial-position polar coordinates ----
  float r0  = length(z0);
  float a0  = juliaAngleCont(z0.x, z0.y);
  float lr0 = log(r0 + 1e-6);

  // ---- Backbone (always on) ----
  // Pure log-radial bands sweeping outward from the focal point.
  // No angular dependence — at uRidgeStrength=0 this is what you see:
  // perfectly concentric rings.
  float sprBackbone = lr0 * 0.48 + spiralPhase * 0.26 + paletteOffset * 0.07;

  // ---- Angular wave perturbations (scaled by uRidgeStrength) ----
  // 2x and 4x angular harmonics twist the concentric rings into
  // spiral arms with rosette deformation.
  float sprWave = 0.036 * sin(2.0 * a0 + lr0 * 1.15 + spiralPhase * 0.85)
                + 0.024 * sin(4.0 * a0 + paletteOffset * 2.1 + lr0 * 0.65);

  // ---- Escape-orbit phase (scaled by uRidgeStrength) ----
  // Uses final z after iteration — encodes how the iteration scattered
  // each point. This is what produces the chaotic-but-coherent fractal
  // embroidery near the boundary.
  float zr2  = max(m2, 1e-6);
  float zang = juliaAngleCont(z.x, z.y);
  float zlr  = log(zr2) * 0.5;
  float sprOrbit = zlr * 0.13
                 + 0.030 * sin(2.0 * zang + zlr * 0.9 + spiralPhase * 0.5)
                 + 0.020 * cos(4.0 * zang + zlr * 0.45 + paletteOffset * 1.3);

  // ---- Linear iteration term — boundary proximity ----
  float tLin = clamp(sn / float(MAX_ITERS), 0.0, 1.0);

  // ---- Combine: backbone always; wave + orbit scaled by slider ----
  float sprSum    = sprBackbone
                  + uRidgeStrength * (sprWave + sprOrbit)
                  + tLin * 0.1;
  float spiralAcc = fract(sprSum);
  float t = clamp(0.3 * tLin + 0.7 * spiralAcc, 0.0, 0.98) * 3.0;
  vec3 col = palette(t);

  // Cymatics escape-edge brightening — always on (it's part of the
  // band structure, not the wave deformation).
  float nearEdge = (1.0 - tLin) * (1.0 - tLin);
  col *= 1.0 + 0.22 * nearEdge;

  // Interior near-black; exterior gets full color treatment
  col *= mix(0.04, 1.2, escaped);

  // Soft tone-map
  col = 1.0 - exp(-col * uIntensity);

  gl_FragColor = vec4(col, 1.0);
}
`;
