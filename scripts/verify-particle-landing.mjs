/**
 * Sanity-check the hand-maintained landing particle script (yin-yang + overlay shell).
 * Run after: python _build_portal.py && node scripts/sync-cymatics-public.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function die(msg) {
  console.error(`verify-particle-landing: ${msg}`);
  process.exit(1);
}

const pubPath = path.join(root, 'public', 'landing', 'js', 'particle-landing.js');
const landPath = path.join(root, 'landing', 'js', 'particle-landing.js');

const target =
  fs.existsSync(pubPath) ? pubPath : fs.existsSync(landPath) ? landPath : null;

if (!target) {
  die(
    `Missing bundle. Expected ${pubPath} (after sync) or ${landPath}`
  );
}

const js = fs.readFileSync(target, 'utf8');

if (!js.includes('yin-yang-elements'))
  die('landing script missing yin-yang-elements / port reference');

if (!js.includes('pm-neon-backdrop'))
  die('landing script missing neon backdrop (pm-neon-backdrop)');

if (!js.includes('__particleMadnessPickDemo'))
  die('landing script missing __particleMadnessPickDemo stub');

/* Prefer light MSAA-off for perf on weak GPUs; standalone spec allows antialias:true */
if (/<span[^>]*>antialias:\s*!0\s*<|\bantialias:\s*!0\b/.test(js))
  die('landing script enables antialias:!0 minified shortcut — prefer antialias: true literals or disable MSAA');

if (!js.includes('Elemental Yin') && !js.includes('ELEMENTAL_YIN_YANG_PORT'))
  die('landing script missing yin-yang port doc breadcrumb');

console.log(`verify-particle-landing: OK (${path.relative(root, target)})`);
