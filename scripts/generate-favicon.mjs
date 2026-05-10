/**
 * Builds repo-root favicon-32.png and favicon.ico.
 *
 * Prefers `public/favicon-neon-om-landing.jpg` — a centred viewport crop of the
 * live landing neon Om — then falls back to `public/om-neon.png`.
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
const landingPath = path.join(root, 'public', 'favicon-neon-om-landing.jpg');
const legacyOmPath = path.join(root, 'public', 'om-neon.png');
const out32 = path.join(root, 'favicon-32.png');
const outIco = path.join(root, 'favicon.ico');

/** Matches static portal theme-color / first-paint backdrop */
const LETTERBOX_BG = { r: 3, g: 5, b: 8, alpha: 1 };

/** Framed crop on wide landing screenshots (~Om + inner particle halo) */
const LANDING_CROP_RATIO = 0.42;

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
  const srcPath = fs.existsSync(landingPath) ? landingPath : legacyOmPath;
  if (!fs.existsSync(srcPath)) {
    console.error('generate-favicon: missing', landingPath, 'and', legacyOmPath);
    process.exit(1);
  }

  const squarePng = fs.existsSync(landingPath)
    ? await landingCropToSquare()
    : await legacySquareFromOmNeon();

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
