/**
 * Load `.env.local` from the project root into `process.env`.
 * - Strips UTF-8 BOM (common on Windows)
 * - Optional `export KEY=value` form
 * - Single-line `KEY=value` with optional double/single quotes
 */
import fs from 'fs';
import path from 'path';

function stripBom(s) {
  if (!s) return s;
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

/**
 * @param {string} projectRoot - Absolute path to repo root (parent of `scripts/`)
 */
export function loadEnvLocal(projectRoot) {
  const p = path.join(projectRoot, '.env.local');
  if (!fs.existsSync(p)) return;
  const text = stripBom(fs.readFileSync(p, 'utf8'));
  for (const line of text.split(/\r?\n/)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.toLowerCase().startsWith('export ')) {
      trimmed = trimmed.slice(7).trim();
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) process.env[key] = val;
  }
}
