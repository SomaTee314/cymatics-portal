/** GLSL for Julia-textured wormhole rings + skybox.
 *
 * Designed for two surface types:
 *   - uMode = 0: ring geometry — additive, edge-faded UV alpha
 *   - uMode = 1: skybox sphere — opaque back-side render
 *
 * Each ring/sky surface runs its own animated Julia c-orbit (driven by
 * uTime + uDepth + uIndex), so every ring shows a slightly different
 * Julia variant, giving the procedural-cosmos feel.
 */

export const wormholeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const wormholeFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uDepth;
uniform float uIndex;
uniform float uZoom;
uniform float uIntensity;
uniform vec2 uCenter;
uniform float uDiscRadius;
uniform float uMode;
uniform float uFractalEvolutionSpeed;

vec3 palette(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.55);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.28318530718 * (c * t + d));
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  vec2 z0 = p / max(uZoom, 1e-3);

  float dEv = uDepth * uFractalEvolutionSpeed;
  float ph1 = uTime * 0.13 + uIndex * 0.7 + dEv * 0.15;
  float ph2 = uTime * 0.17 + uIndex * 1.1 + dEv * 0.13;
  vec2 c = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));

  const int MAX_ITERS = 96;
  const float B = 64.0;
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

  float t = 0.04 * sn + 0.06 * dEv + uIndex * 0.07;
  vec3 col = palette(t);

  float escaped = step(B * B, m2);
  col *= mix(0.14, 1.1, escaped);
  col = 1.0 - exp(-col * uIntensity);

  float alpha = 1.0;
  if (uMode < 0.5) {
    float edgeFade = smoothstep(0.05, 0.35, abs(p.y));
    alpha = edgeFade;
  }
  gl_FragColor = vec4(col, alpha);
}
`;
