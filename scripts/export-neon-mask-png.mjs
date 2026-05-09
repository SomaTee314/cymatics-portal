/**
 * Rasterise mask-draw.js to landing/images/fire-ice-yin-yang-neon.png (340×400).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const maskJs = fs.readFileSync(
  path.join(root, 'landing', 'yin-yang-neon-mask', 'mask-draw.js'),
  'utf8'
);

const html = `<!DOCTYPE html><html><body><canvas id="c" width="340" height="400"></canvas><script>${maskJs}
drawNeonMaskRaster(document.getElementById('c').getContext('2d'), 340, 400);
</script></body></html>`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const b64 = await page.evaluate(() =>
  document.getElementById('c').toDataURL('image/png').split(',')[1]
);
await browser.close();

const out = path.join(root, 'landing', 'images', 'fire-ice-yin-yang-neon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log('export-neon-mask-png:', path.relative(root, out));
