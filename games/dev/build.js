// Assembles games/dist: tsc output (dist/js), static files and the vendored three.js (no CDN at runtime).
// Usage (from games/): node dev/build.js
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, normalize } from 'node:path';
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

// three/addons (examples/jsm) actually used by src/, plus their relative imports (walked recursively).
const ADDONS = [
  'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js', 'postprocessing/UnrealBloomPass.js',
  'postprocessing/OutputPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/SMAAPass.js', 'postprocessing/GTAOPass.js',
  'objects/Sky.js', 'utils/BufferGeometryUtils.js',
];
const jsm = join(three, 'examples', 'jsm');
const seen = new Set();
const walk = (rel) => {
  rel = normalize(rel).replaceAll('\\', '/');
  if (seen.has(rel)) return;
  seen.add(rel);
  const src = join(jsm, rel);
  if (!existsSync(src)) throw new Error(`missing addon ${src}`);
  const out = join(dist, 'vendor', 'three', 'addons', rel);
  mkdirSync(dirname(out), { recursive: true });
  cpSync(src, out);
  for (const m of readFileSync(src, 'utf8').matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)) walk(join(dirname(rel), m[1]));
};
ADDONS.forEach(walk);
console.log(`built games/dist (${seen.size} three addons)`);
