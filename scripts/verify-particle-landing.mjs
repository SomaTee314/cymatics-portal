/**
 * Sanity-check the generated landing particle bundle matches Cymatics portal patches.
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
    `Missing bundle. Expected ${pubPath} (after sync) or ${landPath}; run python _build_portal.py`
  );
}

const js = fs.readFileSync(target, 'utf8');

if (js.includes('antialias:!0'))
  die('landing bundle enables WebGL MSAA (antialias:!0) — revert in _landing_assets.py');

if (js.includes('_sdt=T._sdt'))
  die('landing bundle still uses timestep EMA (_sdt) — unexpected for stock c() timestep');

/** Stock Particle c() integrates raw RAF delta (`T.deltaRatio=e/.016`); Cymatics restores this for natural motion. */
if (!js.includes('T.deltaRatio=e/.016'))
  die('landing bundle missing motion integration T.deltaRatio=e/.016 (stock c())');

/* Stock engine u_color lerps use plain `lerp(...,e)` — do not accelerate with N*e multipliers */
if (/Math\.min\(1,\s*(?:19|20|6|\d+)\s*\*\s*e\)/.test(js))
  die('landing bundle uses accelerated Math.min(1,N*e) u_color lerps — keep stock lerp(...,e)');
if (
  !js.includes('this.uniforms.u_color1.value.lerp(this.color1,e)') ||
  !js.includes('this.uniforms.u_color2.value.lerp(this.color2,e)')
)
  die(
    'landing bundle missing stock u_color1/u_color2 lerp(this.colorN,e) — check _landing_assets.py'
  );

/* Stock y(): full-duration blur tween when exiting portal overlay */
if (!js.includes('M.to(I,1,{ratio:0,blurRadius:2.5,amount:1'))
  die(
    'landing bundle missing stock y() blur tween M.to(I,1,... blurRadius 2.5 ... — check source'
  );

/* Cymatics bootstrap: Low-equivalent sim + DPR cap at init (_landing_assets.py); bridge Low remains safety net. */
if (!js.includes('particlesMotionTextureWidth=256,n.particlesMotionTextureHeight=256'))
  die(
    'landing bundle missing Low-equivalent motion texture 256×256 — check _landing_assets.py bootstrap'
  );
if (!js.includes('n.motionBlur=!1'))
  die('landing bundle missing bootstrap motionBlur off (motionBlur=!1)');
if (!js.includes('n.motionBlurQuality="low"'))
  die('landing bundle missing bootstrap motionBlurQuality "low"');
if (!js.includes('setPixelRatio') || !js.includes('Math.min(1.25,'))
  die(
    'landing bundle missing renderer DPR cap (setPixelRatio Math.min 1.25) — check _landing_assets.py'
  );

// Keep motion blur tier reasonable (do not use "best").
if (js.includes('motionBlurQuality="best"'))
  die('landing bundle boosts motionBlurQuality to "best" — keep "high" for perf');

console.log(`verify-particle-landing: OK (${path.relative(root, target)})`);
