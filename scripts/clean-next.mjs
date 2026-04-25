/**
 * Delete `.next` output.
 * Fixes: chunk JS 404s (main-app.js, app-pages-internals.js, app/global-error.js),
 * __webpack_modules__[moduleId] is not a function, bad RSC flight after:
 *   next build ↔ next dev, failed HMR, git branch switch, or multiple `next dev`
 *   processes sharing this folder.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = path.join(root, '.next');
fs.rmSync(nextDir, { recursive: true, force: true });
console.log('Removed', nextDir);
console.log(
  'Next: run dev once (e.g. npm run dev:3005), hard-refresh the browser (Ctrl+Shift+R). Use npm run dev:3005:fresh to free port 3005, clean .next, sync portal, and start dev.',
);
