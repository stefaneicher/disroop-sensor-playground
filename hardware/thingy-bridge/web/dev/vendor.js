// Copies the pinned three.js (npm devDependency) into static/vendor/three so the dashboard works offline (no CDN).
// The import map in static/index.html maps 'three' and 'three/addons/' to these files.
// Usage (from hardware/thingy-bridge/web/): node dev/vendor.js
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const three = join(root, 'node_modules', 'three');
const out = join(root, 'static', 'vendor', 'three');
const FILES = {
  'build/three.module.js': 'three.module.js',
  'build/three.core.js': 'three.core.js',
  LICENSE: 'LICENSE',
  'examples/jsm/controls/OrbitControls.js': 'addons/controls/OrbitControls.js',
  'examples/jsm/geometries/RoundedBoxGeometry.js': 'addons/geometries/RoundedBoxGeometry.js',
};

rmSync(join(root, 'static', 'vendor'), { recursive: true, force: true });
for (const [from, to] of Object.entries(FILES)) {
  const src = join(three, from);
  if (!existsSync(src)) throw new Error(`missing ${src} (npm ci?)`);
  mkdirSync(dirname(join(out, to)), { recursive: true });
  cpSync(src, join(out, to));
}
console.log('vendored three.js -> static/vendor/three');
