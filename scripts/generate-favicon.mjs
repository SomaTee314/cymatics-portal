/**
 * Builds repo-root favicon-32.png and favicon.ico from public/om-neon.png.
 * Run: node scripts/generate-favicon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcPath = path.join(root, 'public', 'om-neon.png');
const out32 = path.join(root, 'favicon-32.png');
const outIco = path.join(root, 'favicon.ico');

/** Matches static portal theme-color / first-paint backdrop */
const LETTERBOX_BG = { r: 3, g: 5, b: 8, alpha: 1 };

async function main() {
  if (!fs.existsSync(srcPath)) {
    console.error('generate-favicon: missing', srcPath);
    process.exit(1);
  }

  const meta = await sharp(srcPath).metadata();
  const side = Math.max(meta.width ?? 0, meta.height ?? 0) || 512;

  const squarePng = await sharp(srcPath)
    .resize(side, side, {
      fit: 'contain',
      position: 'centre',
      background: LETTERBOX_BG,
    })
    .png()
    .toBuffer();

  const buf32 = await sharp(squarePng).resize(32, 32).png().toBuffer();
  const buf16 = await sharp(squarePng).resize(16, 16).png().toBuffer();

  fs.writeFileSync(out32, buf32);
  const icoBuf = await toIco([buf16, buf32]);
  fs.writeFileSync(outIco, Buffer.from(icoBuf));

  const kbIco = (fs.statSync(outIco).size / 1024).toFixed(1);
  console.log(
    'generate-favicon: wrote',
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
