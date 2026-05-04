import * as THREE from 'three';

/**
 * Turn a loaded Om image into a canvas texture with alpha keyed from dark
 * background (neon strokes stay opaque; black/near-black becomes transparent).
 *
 * Uses **luminance** (not max(R,G,B)): navy plate backgrounds often have a
 * strong blue channel but still read “dark”, and max-based keys wrongly
 * treat them as opaque—hence visible squares around each billboard.
 *
 * RGB is **premultiplied by alpha** so additive blending does not add a
 * colored tint from semi-transparent edge pixels.
 */
export function preprocessOmTexture(tex: THREE.Texture): THREE.CanvasTexture {
  const img = tex.image as HTMLImageElement | HTMLCanvasElement;
  const w = img.width;
  const h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    let a = 0;
    if (l > 0.1) {
      const t = Math.min(1, (l - 0.1) / 0.5);
      a = Math.min(1, t ** 0.45);
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
  const pot =
    THREE.MathUtils.isPowerOfTwo(w) && THREE.MathUtils.isPowerOfTwo(h);
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
