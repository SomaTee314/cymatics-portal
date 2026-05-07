/**
 * Puppeteer smoke: wormhole preset screenshot + luminance variance in inner vs peripheral ROIs.
 * Expects updated index.html (run python _build_portal.py first).
 *
 * WORMHOLE_VERIFY_URL=file:///... | http://localhost:3000/...  Override page URL.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { PNG } from 'pngjs';
import puppeteer from 'puppeteer';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function die(msg, extra = null) {
  console.error(`verify-annulus-julia: FAIL — ${msg}`);
  if (extra != null) console.error(extra);
  process.exit(1);
}

function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  let s = 0;
  let i;
  for (i = 0; i < values.length; i++) {
    const d = values[i] - mean;
    s += d * d;
  }
  return Math.sqrt(s / (values.length - 1));
}

function lumAt(data, w, h, xi, yi) {
  let x = xi;
  let y = yi;
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x >= w) x = w - 1;
  if (y >= h) y = h - 1;
  const j = (w * y + x) << 2;
  const R = data[j] / 255;
  const G = data[j + 1] / 255;
  const B = data[j + 2] / 255;
  return 0.299 * R + 0.587 * G + 0.114 * B;
}

/** Mean |∂x L|+|∂y L| in peripheral ROI (reject flat bands). */
function meanPeripheralGradient(d, w, h, cx, cy, scale) {
  const step = 2;
  let sum = 0;
  let count = 0;
  let y;
  for (y = step; y < h - step; y += step) {
    let x;
    for (x = step; x < w - step; x += step) {
      const nx = (x + 0.5 - cx) / scale;
      const ny = (y + 0.5 - cy) / scale;
      const r = Math.sqrt(nx * nx + ny * ny);
      if (r <= 0.38 || r >= 0.96) continue;
      const L = lumAt(d, w, h, x, y);
      const Lx = lumAt(d, w, h, x + step, y);
      const Ly = lumAt(d, w, h, x, y + step);
      sum += Math.abs(Lx - L) + Math.abs(Ly - L);
      count++;
    }
  }
  return count ? sum / count : 0;
}

/** Mean |∂x L|+|∂y L| in an annulus rMin..rMax in normalized screen coords (large near-camera ring band). */
function meanAnnulusGradient(d, w, h, cx, cy, scale, rMin, rMax) {
  const step = 2;
  let sum = 0;
  let count = 0;
  let y;
  for (y = step; y < h - step; y += step) {
    let x;
    for (x = step; x < w - step; x += step) {
      const nx = (x + 0.5 - cx) / scale;
      const ny = (y + 0.5 - cy) / scale;
      const r = Math.sqrt(nx * nx + ny * ny);
      if (r < rMin || r > rMax) continue;
      const L = lumAt(d, w, h, x, y);
      const Lx = lumAt(d, w, h, x + step, y);
      const Ly = lumAt(d, w, h, x, y + step);
      sum += Math.abs(Lx - L) + Math.abs(Ly - L);
      count++;
    }
  }
  return count ? sum / count : 0;
}

const indexHtml = path.join(root, 'index.html');
if (!fs.existsSync(indexHtml)) die(`Missing ${indexHtml}; run python _build_portal.py`);

let pageUrl = process.env.WORMHOLE_VERIFY_URL || pathToFileURL(indexHtml).href;
if (!/[?&]skip=1(?:&|$)/.test(pageUrl)) {
  pageUrl += pageUrl.includes('?') ? '&skip=1' : '?skip=1';
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

  await page.waitForSelector('#portal-container canvas', { timeout: 60000 });

  const ok = await page.evaluate(() => {
    const sel = document.getElementById('aggressionSel');
    if (!sel) return 'no aggressionSel';
    sel.value = 'juliaWH_cauliflower';
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return '';
  });
  if (ok) die(`Could not select wormhole preset: ${ok}`);

  await new Promise((r) => setTimeout(r, 6500));

  const buf = await page.screenshot({ type: 'png' });
  let png;
  try {
    png = PNG.sync.read(buf);
  } catch (e) {
    die('PNG decode failed', e);
  }

  const w = png.width;
  const h = png.height;
  const d = png.data;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const scale = 0.5 * Math.min(w, h);

  const innerL = [];
  const periL = [];
  const nearRingL = [];
  const nearInner = 0.2;
  const nearOuter = 0.52;

  let y;
  for (y = 0; y < h; y += 2) {
    let x;
    for (x = 0; x < w; x += 2) {
      const i = (w * y + x) << 2;
      const R = d[i] / 255;
      const G = d[i + 1] / 255;
      const B = d[i + 2] / 255;
      const L = 0.299 * R + 0.587 * G + 0.114 * B;
      const nx = (x + 0.5 - cx) / scale;
      const ny = (y + 0.5 - cy) / scale;
      const r = Math.sqrt(nx * nx + ny * ny);
      if (r < 0.22) innerL.push(L);
      else if (r > 0.38 && r < 0.96) periL.push(L);
      if (r >= nearInner && r <= nearOuter) nearRingL.push(L);
    }
  }

  const innerStd = stddev(innerL);
  const periStd = stddev(periL);
  const nearRingStd = stddev(nearRingL);
  const ratio = innerStd > 1e-6 ? periStd / innerStd : 0;
  const periGradMean = meanPeripheralGradient(d, w, h, cx, cy, scale);
  const nearRingGradMean = meanAnnulusGradient(d, w, h, cx, cy, scale, nearInner, nearOuter);

  console.log('verify-annulus-julia: stats', {
    innerSamples: innerL.length,
    periSamples: periL.length,
    nearRingSamples: nearRingL.length,
    innerStd: Number(innerStd.toFixed(5)),
    periStd: Number(periStd.toFixed(5)),
    nearRingStd: Number(nearRingStd.toFixed(5)),
    ratio: Number(ratio.toFixed(4)),
    periGradMean: Number(periGradMean.toFixed(6)),
    nearRingGradMean: Number(nearRingGradMean.toFixed(6)),
  });

  if (innerL.length < 500) die('Too few inner ROI samples (canvas black or wrong layout?)');
  if (periL.length < 2000) die('Too few peripheral ROI samples');
  if (innerStd < 0.012) die('Inner ROI nearly flat — wormhole may not be rendering', { innerStd });
  if (ratio < 0.28) {
    die('Peripheral luminance variance too low vs inner (flat outer hoops)', {
      innerStd,
      periStd,
      ratio,
    });
  }
  if (periGradMean < 0.0055) {
    die('Peripheral mean luminance gradient too low — likely solid annuli without fractal edge detail', {
      periGradMean,
    });
  }
  if (nearRingL.length < 800) {
    die('Too few near-ring band ROI samples (layout or band bounds)', { nearRingSamples: nearRingL.length });
  }
  if (nearRingStd < 0.01) {
    die('Near-camera annulus band nearly flat — weak Julia texture on large rings', { nearRingStd });
  }
  if (nearRingGradMean < 0.0042) {
    die('Near-ring mean luminance gradient too low — large hoops reading as plain colour', {
      nearRingGradMean,
    });
  }

  console.log('verify-annulus-julia: OK');
} finally {
  await browser.close();
}
