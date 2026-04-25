# SEO Assets — Next Steps for Cursor

## Implementation status (Cymatics Portal)

**Done in repo:** `robots.txt`, `llms.txt`, `sitemap.xml` (with `image:image` for OG), and **`og-image.png` at the project root** (not under `public/` — this app is plain static HTML on Vercel, which serves paths from the repo root; Next.js-style `public/` would expose files as `/public/...`). OG PNG from `og-image.html` via `npm run generate:og` (~657 KB at 1× DPR). Meta tags in `index.html` from `_build_portal.py`. Host: **`https://cymatics-portal.vercel.app`** (`CYMATICS_SITE_URL` override when building). Pillow fallback: `python scripts/generate_og_pillow.py`.

---

## Overview

This document covers three remaining SEO tasks:

1. Add `og-image.png` and update meta tags for `summary_large_image`
2. Move static SEO files (`robots.txt`, `llms.txt`, `sitemap.xml`) into `/public` for Vercel root serving
3. Validate the setup

---

## 0  CURSOR — Run This First

> **Paste this prompt into Cursor chat before starting the tasks below.**

```
Do the following two find-and-replace tasks across the project:

1. In `og-image.html`, find the `.fractal-bg` CSS rule that contains:
   background: url('/mnt/user-data/uploads/Screenshot_2026-04-04_234319.png')
   Replace that URL with the correct relative path to the fractal background image in this repo. Search the project for any .png or .jpg file that looks like a fractal/mandelbrot hero image (likely in /public, /assets, /images, or /src/assets). If no matching image exists yet, copy the fractal image into public/images/fractal-bg.png and use the path '/images/fractal-bg.png'.

2. Across ALL files in the project (especially seo-next-steps.md, og-image.html, app/layout.tsx or equivalent, sitemap.xml, and any SEO config), find every instance of YOUR_DOMAIN and replace it with the actual production domain for this project. To find the domain:
   - Check vercel.json, .env, .env.production, or next.config.js for any domain/URL config
   - Check package.json "homepage" field
   - Check any existing meta tags in the HTML head for og:url or canonical
   - If none found, check the Vercel project name and use [project-name].vercel.app
   - If still unclear, flag it and ask me

After completing both replacements, list every file you changed and what the final values are so I can confirm.
```

---

## 1  OG Image

### 1.1  Generate the image

A ready-made `og-image.html` template is provided alongside this file. It is a 1200×630 HTML layout that composites the fractal background with CYMATICS PORTAL branding, glow effects, scan lines, corner accents, and feature pills.

**To produce the PNG:**

Option A — Puppeteer script (recommended for CI/reproducibility):

```bash
npm install puppeteer --save-dev
```

Create `scripts/generate-og.mjs`:

```js
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generate() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.goto(`file://${path.resolve(__dirname, '../og-image.html')}`, {
    waitUntil: 'networkidle0',
  });
  await page.screenshot({
    path: path.resolve(__dirname, '../og-image.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  await browser.close();
  console.log('✅ og-image.png generated at repo root');
}

generate();
```

Run:

```bash
node scripts/generate-og.mjs
```

Option B — Manual: open `og-image.html` in Chrome at exactly 1200×630 viewport (DevTools → device toolbar → set dimensions), screenshot, save as `og-image.png` in the repo root.

**Important:** The `og-image.html` references the fractal background image. Before generating, ensure the fractal screenshot is accessible at the path specified in the CSS `.fractal-bg` rule. Update the `background: url(...)` to point to the correct local path of your fractal image.

### 1.2  Place the file

```
public/
  og-image.png          ← 1200×630, < 1 MB ideally
```

Vercel (static) serves this at `https://yourdomain.com/og-image.png` when the file is at repo root.

---

## 2  Update Meta Tags

In your root layout or `<Head>` component (e.g. `app/layout.tsx`, `pages/_app.tsx`, or `index.html` depending on framework), find the existing OG/Twitter meta tags and replace with:

```html
<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:title" content="Cymatics Portal — Sound Made Visible" />
<meta property="og:description" content="Explore Chladni standing-wave patterns, Solfeggio frequencies, and sacred geometry in real-time 3D. Built with Three.js and Web Audio API." />
<meta property="og:image" content="https://cymatics-portal.vercel.app/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Cymatics Portal — fractal geometry with Chladni wave patterns" />
<meta property="og:url" content="https://cymatics-portal.vercel.app/" />

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Cymatics Portal — Sound Made Visible" />
<meta name="twitter:description" content="Real-time Chladni patterns, Solfeggio frequencies & sacred geometry in 3D." />
<meta name="twitter:image" content="https://cymatics-portal.vercel.app/og-image.png" />
<meta name="twitter:image:alt" content="Cymatics Portal — fractal geometry with Chladni wave patterns" />
```

**Replace `YOUR_DOMAIN`** with the actual production URL (e.g. `cymaticsportal.vercel.app` or custom domain).

If using Next.js App Router with `metadata` export:

```ts
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Cymatics Portal — Sound Made Visible',
  description: 'Explore Chladni standing-wave patterns, Solfeggio frequencies, and sacred geometry in real-time 3D.',
  openGraph: {
    type: 'website',
    title: 'Cymatics Portal — Sound Made Visible',
    description: 'Explore Chladni standing-wave patterns, Solfeggio frequencies, and sacred geometry in real-time 3D. Built with Three.js and Web Audio API.',
    url: 'https://cymatics-portal.vercel.app/',
    images: [
      {
        url: 'https://cymatics-portal.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cymatics Portal — fractal geometry with Chladni wave patterns',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cymatics Portal — Sound Made Visible',
    description: 'Real-time Chladni patterns, Solfeggio frequencies & sacred geometry in 3D.',
    images: ['https://cymatics-portal.vercel.app/og-image.png'],
  },
};
```

---

## 3  Static Files location

**Next.js:** use `public/` so files map to the domain root.

**This repo (plain static HTML on Vercel):** keep `robots.txt`, `sitemap.xml`, `llms.txt`, and `og-image.png` in the **project root** so they are served as `/robots.txt`, etc. A `public/` subfolder would be served as `/public/...` unless you add rewrites.

Ensure these exist at repo root:

```
./robots.txt
./sitemap.xml
./llms.txt
./og-image.png
```

`python _build_portal.py` writes the three text/XML files to root. If they lived elsewhere, **move** them, e.g.:

```bash
# Example — only if you had them under a subfolder
mv docs/robots.txt ./robots.txt
```

### 3.1  Verify `.vercelignore`

Open `.vercelignore` (if it exists) and confirm none of these files are listed. They should NOT appear:

```
# These must NOT be in .vercelignore:
# robots.txt, sitemap.xml, llms.txt, og-image.png (repo root for this static site)
```

### 3.2  Verify `sitemap.xml` includes OG image

If your sitemap references image assets, add the OG image URL:

```xml
<url>
    <loc>https://cymatics-portal.vercel.app/</loc>
    <image:image>
      <image:loc>https://cymatics-portal.vercel.app/og-image.png</image:loc>
    <image:title>Cymatics Portal</image:title>
  </image:image>
</url>
```

---

## 4  Validation Checklist

After deploying, verify everything works:

| Check | How |
|---|---|
| OG image loads | Visit `https://cymatics-portal.vercel.app/og-image.png` directly |
| robots.txt | Visit `https://cymatics-portal.vercel.app/robots.txt` |
| sitemap.xml | Visit `https://cymatics-portal.vercel.app/sitemap.xml` |
| llms.txt | Visit `https://cymatics-portal.vercel.app/llms.txt` |
| OG preview | Use [opengraph.xyz](https://www.opengraph.xyz/) or Facebook Sharing Debugger |
| Twitter card | Use [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) |
| Meta tags in source | View page source → search for `og:image` |

### Common gotchas

- **Cached OG previews**: Social platforms cache OG images aggressively. Use Facebook's Sharing Debugger "Scrape Again" button and Twitter's validator to force re-fetch after deploy.
- **Image too large**: Keep `og-image.png` under 1 MB. If the Puppeteer output is large, run through `pngquant` or `optipng`.
- **Mixed content**: If your site uses HTTPS, the `og:image` URL must also be HTTPS.
- **Relative URLs won't work**: OG image URLs must be absolute (full `https://...` path), not relative.

---

## 5  Commit

Stage and commit all changes:

```bash
git add og-image.png robots.txt sitemap.xml llms.txt
git add app/layout.tsx  # or wherever meta tags live
git add scripts/generate-og.mjs og-image.html  # optional: include source
git commit -m "feat(seo): add OG image, summary_large_image meta, serve static SEO files at root"
```

Deploy to Vercel — the static files will be served at the domain root automatically.
