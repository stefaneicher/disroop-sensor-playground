// Assembles tennis/dist: tsc output (dist/js), static files and the vendored three.js (no CDN at runtime).
// Usage (from tennis/): node dev/build.js
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'vendor', 'three'), { recursive: true });

const tsc = spawnSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(root, 'tsconfig.json')], { stdio: 'inherit' });
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

cpSync(join(root, 'static'), dist, { recursive: true });
const three = join(root, 'node_modules', 'three');
for (const f of ['build/three.module.js', 'build/three.core.js', 'LICENSE']) {
  const src = join(three, f);
  if (!existsSync(src)) throw new Error(`missing ${src} (npm ci?)`);
  cpSync(src, join(dist, 'vendor', 'three', f.replace('build/', '')));
}
console.log('built tennis/dist');
