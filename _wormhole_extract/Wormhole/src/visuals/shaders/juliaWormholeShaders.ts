/** GLSL for Julia-textured wormhole rings + skybox.
 *
 * Ring mapping uses polar coordinates from geometry (vLoc) instead of stretching
 * (vUv-0.5)*2 across the UV square — that skew made outer circumference sample a
 * line with nearly constant Im(z0), wiping fractal variation into smooth bands.
 */

export const wormholeVertex = /* glsl */ `
varying vec2 vUv;
uniform float uRingRefR;
varying vec2 vLoc;
void main() {
  vUv = uv;
  vLoc = position.xy / max(uRingRefR, 1e-3);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const wormholeFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec2 vLoc;
uniform float uTime;
uniform float uDepth;
uniform float uIndex;
uniform float uZoom;
uniform float uIntensity;
uniform vec2 uCenter;
uniform float uDiscRadius;
uniform float uMode;
uniform float uFractalEvolutionSpeed;
uniform float uAnnInnerN;
uniform float uAnnOuterN;

vec3 palette(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.55);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.28318530718 * (c * t + d));
}

void main() {
  float rl = length(vLoc);
  float denom = max(uAnnOuterN - uAnnInnerN, 0.001);
  float tRadial = clamp((rl - uAnnInnerN) / denom, 0.0, 1.0);
  float psi = atan(vLoc.y, vLoc.x);
  float ringTwist = uIndex * 0.713;
  float wrapK = 3.0 + mod(uIndex, 4.0);
  float psiWrap = psi * wrapK + ringTwist + 0.38 * sin(psi * 0.5 + uIndex * 0.17);
  vec2 dirP = vec2(cos(psiWrap), sin(psiWrap));
  float magRadial = 1.0 + 0.042 * sin((tRadial + uIndex * 0.03) * 6.28318530718);
  float mag = mix(0.67, 0.715, tRadial) * magRadial;
  vec2 z0 = dirP * mag / max(uZoom, 1e-3);

  float dEv = uDepth * uFractalEvolutionSpeed;
  float cycleParam = 0.5 - 0.5 * cos(6.28318530718 * (uTime * 0.15 + uIndex * 0.04));
  float ph1 = uTime * 0.13 + uIndex * 0.7 + dEv * 0.15 + cycleParam * 0.35;
  float ph2 = uTime * 0.17 + uIndex * 1.1 + dEv * 0.13 + cycleParam * 0.42;
  vec2 jC = uCenter + uDiscRadius * vec2(cos(ph1), sin(ph2));

  const int MAX_ITERS = 96;
  const float B = 64.0;
  const float INV_TWO_PI = 0.15915494309189535;
  vec2 z = z0;
  float m2 = dot(z, z);
  float n = 0.0;
  for (int i = 0; i < MAX_ITERS; i++) {
    if (m2 > B * B) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + jC;
    m2 = dot(z, z);
    n += 1.0;
  }
  float sn = n - log2(log2(max(m2, 1.0001))) + 4.0;
  float zAng = atan(z.y, z.x);
  float tanAng = atan(vLoc.y, vLoc.x);
  float tLin = clamp(n / float(MAX_ITERS), 0.0, 1.0);
  float escaped = step(B * B, m2);
  float interiorW = 1.0 - escaped;
  float zm = max(m2, 1e-7);
  float trapOrbit = fract(zAng * INV_TWO_PI * 3.1 + log(zm) * 0.14 + uIndex * 0.09);
  float trap2 = fract(tanAng * 2.7 + tRadial * 4.1 + uIndex * 0.11);
  float tRaw =
    0.04 * sn +
    0.06 * dEv +
    uIndex * 0.07 +
    cycleParam * 0.12 +
    0.062 * zAng * INV_TWO_PI +
    0.048 * tanAng * INV_TWO_PI +
    0.16 * tLin * interiorW +
    0.11 * trapOrbit * interiorW +
    0.06 * trap2 * interiorW;
  float paletteT = clamp(fract(tRaw), 0.001, 0.999);
  vec3 col = palette(paletteT);

  float interBright = clamp(0.48 + 0.42 * tLin + 0.28 * trapOrbit + 0.14 * trap2, 0.44, 0.96);
  col *= mix(interBright, 1.06, escaped);
  col = 1.0 - exp(-col * uIntensity);

  float alpha = 1.0;
  if (uMode < 0.5) {
    float edgeFade =
      smoothstep(0.0, 0.09, tRadial) * smoothstep(1.0, 0.96, tRadial);
    alpha = edgeFade;
  }
  gl_FragColor = vec4(col, alpha);
}
`;
