import * as THREE from 'three';

/**
 * Strip the navy/starfield plate from om-neon.png: threshold into a mask, keep
 * only the largest 8-connected component (the centred Om glyph + glow), derive
 * soft alpha inside that mask only, premultiply RGB for additive sprites.
 *
 * Mirrors `wormholeOmTextureTransparencyFromMap` in the portal wormhole fragment.
 */
export function preprocessOmTexture(tex: THREE.Texture): THREE.CanvasTexture {
  const img = tex.image as HTMLImageElement | HTMLCanvasElement;
  const w = img.width;
  const h = img.height;
  const n = w * h;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  const lumArr = new Float32Array(n);
  const satArr = new Float32Array(n);
  const bw = new Uint8Array(n);
  for (let pi = 0; pi < n; pi++) {
    const o = pi * 4;
    const rn = d[o]! / 255;
    const gn = d[o + 1]! / 255;
    const bn = d[o + 2]! / 255;
    const mx = Math.max(rn, Math.max(gn, bn));
    const mn = Math.min(rn, Math.min(gn, bn));
    lumArr[pi] = rn * 0.299 + gn * 0.587 + bn * 0.114;
    satArr[pi] = mx - mn;
    bw[pi] = lumArr[pi] > 0.41 || satArr[pi] > 0.32 ? 1 : 0;
  }

  const comp = new Int32Array(n);
  for (let pi = 0; pi < n; pi++) {
    comp[pi] = bw[pi] ? 0 : -1;
  }

  let cid = 0;
  const compSizes: number[] = [];
  const q = new Int32Array(n);

  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const si = sy * w + sx;
      if (comp[si] !== 0) continue;
      cid++;
      let qt = 0;
      q[qt++] = si;
      comp[si] = cid;
      let cnt = 0;
      let qh = 0;
      while (qh < qt) {
        const ci = q[qh++]!;
        cnt++;
        const cy = (ci / w) | 0;
        const cx = ci - cy * w;
        for (let oy = -1; oy <= 1; oy++) {
          const ny = cy + oy;
          if (ny < 0 || ny >= h) continue;
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            const nx = cx + ox;
            if (nx < 0 || nx >= w) continue;
            const ni = ny * w + nx;
            if (comp[ni] !== 0) continue;
            comp[ni] = cid;
            q[qt++] = ni;
          }
        }
      }
      compSizes[cid] = cnt;
    }
  }

  let bestCid = 1;
  let bestSz = compSizes[1] ?? 0;
  for (let c = 2; c <= cid; c++) {
    const sc = compSizes[c] ?? 0;
    if (sc > bestSz) {
      bestSz = sc;
      bestCid = c;
    }
  }

  for (let i = 0; i < d.length; i += 4) {
    const idx = (i / 4) | 0;
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const rn2 = r / 255;
    const gn2 = g / 255;
    const bn2 = b / 255;
    const mx2 = Math.max(rn2, Math.max(gn2, bn2));
    const mn2 = Math.min(rn2, Math.min(gn2, bn2));
    const lum =
      rn2 * 0.299 + gn2 * 0.587 + bn2 * 0.114;
    const sat = mx2 - mn2;
    const cyanLean = gn2 - Math.max(rn2, bn2);
    let a = 0;
    const inGlyph = bw[idx] === 1 && comp[idx] === bestCid;
    if (inGlyph && !(lum < 0.125 && sat < 0.055 && mx2 < 0.4) && !(lum < 0.068 && mx2 < 0.22)) {
      const energy = lum * 0.95 + sat * 2.4 + mx2 * 0.45 + Math.max(0, cyanLean) * 0.85;
      a = Math.pow(Math.min(1, Math.max(0, (energy - 0.1) / 0.92)), 0.88);
    }
    const a8 = Math.round(a * 255);
    d[i + 3] = a8;
    d[i] = Math.round((r * a8) / 255);
    d[i + 1] = Math.round((g * a8) / 255);
    d[i + 2] = Math.round((b * a8) / 255);
  }

  ctx.putImageData(imageData, 0, 0);
  const out = new THREE.CanvasTexture(canvas);
  out.colorSpace = THREE.SRGBColorSpace;
  out.premultiplyAlpha = true;
  const pot = THREE.MathUtils.isPowerOfTwo(w) && THREE.MathUtils.isPowerOfTwo(h);
  out.generateMipmaps = pot;
  out.minFilter = pot ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  out.magFilter = THREE.LinearFilter;
  out.needsUpdate = true;
  tex.dispose();
  return out;
}

export function loadOmTexture(url: string): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        resolve(preprocessOmTexture(tex));
      },
      undefined,
      (err) => {
        reject(err instanceof Error ? err : new Error('Texture load failed'));
      },
    );
  });
}
