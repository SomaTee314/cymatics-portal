/**
 * Renders og-image.html at 1200×630 and writes og-image.png at repo root (static Vercel).
 * Run: npm install && npm run generate:og
 */
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "og-image.html");
const outFile = path.join(root, "og-image.png");

async function generate() {
  if (!fs.existsSync(htmlPath)) {
    console.error("Missing og-image.html at repo root:", htmlPath);
    process.exit(1);
  }
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.screenshot({
    path: outFile,
    type: "png",
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  await browser.close();
  const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log("Wrote", outFile, `(${kb} KB)`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
