/**
 * Builds repo-root favicon-32.png and favicon.ico.
 *
 * Source priority:
 *   1. `public/nocturnal-labs-favicon-source.jpg` — Nocturnal Labs brand mark
 *   2. `public/favicon-neon-om-landing.jpg` — centred landing Om screenshot crop
 *   3. `public/om-neon.png` — legacy neon Om texture
 *
 * Run: node scripts/generate-favicon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const brandPath = path.join(root, 'public', 'nocturnal-labs-favicon-source.jpg');
const landingPath = path.join(root, 'public', 'favicon-neon-om-landing.jpg');
const legacyOmPath = path.join(root, 'public', 'om-neon.png');
const out32 = path.join(root, 'favicon-32.png');
const outIco = path.join(root, 'favicon.ico');

/** Site chrome / static portal backdrop */
const LETTERBOX_BG = { r: 3, g: 5, b: 8, alpha: 1 };
/** Matches Nocturnal Labs emblem matte backing */
const BRAND_BG = { r: 0, g: 0, b: 0, alpha: 1 };

/** Framed crop on wide landing screenshots (~Om + inner particle halo) */
const LANDING_CROP_RATIO = 0.42;

async function squareFromBrand() {
  const meta = await sharp(brandPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const side = Math.max(w, h) || 512;

  return sharp(brandPath)
    .resize(side, side, {
      fit: 'contain',
      position: 'centre',
      background: BRAND_BG,
    })
    .resize(384, 384, { kernel: sharp.kernel.lanczos3 })
    .modulate({ saturation: 1.06, lightness: 1.01 })
    .sharpen({ sigma: 0.4, m1: 0.55, m2: 0.2 })
    .flatten({ background: BRAND_BG })
    .png()
    .toBuffer();
}

async function landingCropToSquare() {
  const meta = await sharp(landingPath).metadata();
  const mw = meta.width ?? 0;
  const mh = meta.height ?? 0;
  const minEdge = Math.min(mw, mh);
  let side = Math.max(16, Math.floor(minEdge * LANDING_CROP_RATIO));
  side = Math.min(side, mw, mh);
  const left = Math.floor((mw - side) / 2);
  const top = Math.floor((mh - side) / 2);

  return sharp(landingPath)
    .extract({ left, top, width: side, height: side })
    .resize(320, 320, { kernel: sharp.kernel.lanczos3 })
    .modulate({ saturation: 1.1, lightness: 1.02 })
    .sharpen({ sigma: 0.65, m1: 0.6, m2: 0.25 })
    .flatten({ background: LETTERBOX_BG })
    .png()
    .toBuffer();
}

async function legacySquareFromOmNeon() {
  const meta = await sharp(legacyOmPath).metadata();
  const side = Math.max(meta.width ?? 0, meta.height ?? 0) || 512;

  return sharp(legacyOmPath)
    .resize(side, side, {
      fit: 'contain',
      position: 'centre',
      background: LETTERBOX_BG,
    })
    .png()
    .toBuffer();
}

async function main() {
  let squarePng;
  let srcPath;

  if (fs.existsSync(brandPath)) {
    squarePng = await squareFromBrand();
    srcPath = brandPath;
  } else if (fs.existsSync(landingPath)) {
    squarePng = await landingCropToSquare();
    srcPath = landingPath;
  } else if (fs.existsSync(legacyOmPath)) {
    squarePng = await legacySquareFromOmNeon();
    srcPath = legacyOmPath;
  } else {
    console.error(
      'generate-favicon: no source — add',
      path.relative(root, brandPath),
      'or',
      path.relative(root, landingPath),
      'or',
      path.relative(root, legacyOmPath),
    );
    process.exit(1);
  }

  const buf32 = await sharp(squarePng).resize(32, 32).png().toBuffer();
  const buf16 = await sharp(squarePng).resize(16, 16).png().toBuffer();

  fs.writeFileSync(out32, buf32);
  const icoBuf = await toIco([buf16, buf32]);
  fs.writeFileSync(outIco, Buffer.from(icoBuf));

  const kbIco = (fs.statSync(outIco).size / 1024).toFixed(1);
  console.log(
    'generate-favicon: source',
    path.relative(root, srcPath),
    '→ wrote',
    path.relative(root, out32),
    '&',
    path.relative(root, outIco),
    `(${kbIco} KB ico)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
