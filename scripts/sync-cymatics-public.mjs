/**
 * Copy the built static portal into public/ so Next.js can serve /cymatics.html and assets.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');

fs.mkdirSync(pub, { recursive: true });

const indexHtml = path.join(root, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.warn('sync-cymatics-public: index.html missing — run python _build_portal.py first');
  process.exit(0);
}

fs.copyFileSync(indexHtml, path.join(pub, 'cymatics.html'));

for (const dir of ['vendor', 'landing']) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(pub, dir), { recursive: true });
  }
}

/* robots.txt + sitemap: owned by Next.js app (public/robots.txt, app/sitemap.ts) */
for (const f of ['favicon.ico', 'favicon-32.png', 'og-image.png']) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(pub, f));
  }
}

console.log('sync-cymatics-public: wrote public/cymatics.html and assets');
