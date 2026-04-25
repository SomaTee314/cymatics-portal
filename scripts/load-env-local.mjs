/**
 * Load project secrets from the repo root into `process.env`.
 *
 * **Primary file: `.env.sh`** (all keys, URLs, DB password). If missing, falls back to `.env.local`
 * for older setups.
 *
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

function loadEnvFile(absolutePath) {
  const text = stripBom(fs.readFileSync(absolutePath, 'utf8'));
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

/**
 * @param {string} projectRoot - Absolute path to repo root
 */
export function loadProjectEnv(projectRoot) {
  const sh = path.join(projectRoot, '.env.sh');
  const local = path.join(projectRoot, '.env.local');
  if (fs.existsSync(sh)) {
    loadEnvFile(sh);
    return;
  }
  if (fs.existsSync(local)) {
    loadEnvFile(local);
  }
}

/** @deprecated use loadProjectEnv — same function */
export const loadEnvLocal = loadProjectEnv;
