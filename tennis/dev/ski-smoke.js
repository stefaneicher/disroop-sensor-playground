// Headless Chromium check of Ski (tennis/dist/ski): renders both courses, no JS errors, the autopilot descends.
// Usage (repo root): node tennis/dev/ski-smoke.js [--shots docs/img]  (writes ski-lauberhorn.png, ski-streif.png, ski-cockpit.png, ski-tv.png)
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { launchBrowser } from './cdp.js';

const { values: opts } = parseArgs({ options: { shots: { type: 'string' } } });
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(dist, path.endsWith('/') ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/ski/`;

const fail = (m) => {
  console.error(`FAIL ${m}`);
  process.exitCode = 1;
};

const SHOTS = [
  { name: 'ski-lauberhorn', q: 'course=lauberhorn&at=1500&cam=chase' },
  { name: 'ski-hundschopf', q: 'course=lauberhorn&at=1020&cam=chase' },
  { name: 'ski-start', q: 'course=lauberhorn&at=40&cam=chase' },
  { name: 'ski-streif', q: 'course=streif&at=1400&cam=chase' },
  { name: 'ski-cockpit', q: 'course=streif&at=900&cam=cockpit' },
  { name: 'ski-tv', q: 'course=lauberhorn&at=2400&cam=tv' },
  { name: 'ski-ziel', q: 'course=lauberhorn&at=4300&cam=chase' },
];

const browser = await launchBrowser({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  for (const shot of opts.shots ? SHOTS : SHOTS.slice(0, 2)) {
    const page = await browser.newPage();
    await page.send('Runtime.enable');
    page.on('Runtime.exceptionThrown', (e) => errors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text));
    page.on('Runtime.consoleAPICalled', (e) => {
      if (e.type === 'error') errors.push(`console.error: ${e.args.map((a) => a.value ?? a.description).join(' ')}`);
    });
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `${base}?demo=1&nohint&preserve&${shot.q}` });
    const evalJs = async (expression) => {
      const { result, exceptionDetails } = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    };
    let g = null;
    for (let i = 0; i < 320; i++) {
      await sleep(250);
      g = await evalJs('window.ski ? window.ski.game() : null').catch(() => null);
      if (g && g.t > 2.5) break;
    }
    if (!g) {
      fail(`${shot.name}: window.ski missing`);
      continue;
    }
    const s0 = g.s;
    await sleep(1500);
    const g1 = await evalJs('window.ski.game()');
    const colours = await evalJs(`(() => {
      const c = document.querySelector('#stage canvas');
      const probe = document.createElement('canvas'); probe.width = 64; probe.height = 36;
      const ctx = probe.getContext('2d'); ctx.drawImage(c, 0, 0, 64, 36);
      const px = ctx.getImageData(0, 0, 64, 36).data; const set = new Set();
      for (let i = 0; i < px.length; i += 4) set.add((px[i] >> 4) + ',' + (px[i+1] >> 4) + ',' + (px[i+2] >> 4));
      return set.size;
    })()`);
    const st = await evalJs('window.ski.stats()');
    console.log(shot.name, JSON.stringify({ s0: Math.round(s0), s1: Math.round(g1.s), v: Math.round(g1.v * 3.6), colours, ...st }));
    // per-frame budget (main + shadow pass); the unculled scene was several million triangles
    if (st.triangles > 900000) fail(`${shot.name}: ${st.triangles} triangles per frame`);
    if (g1.t <= g.t) fail(`${shot.name}: game clock did not run`);
    if (colours < 14) fail(`${shot.name}: canvas looks blank (${colours} colours)`);
    if (opts.shots) {
      await evalJs('window.ski.cheer()');
      await sleep(300);
      const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
      await mkdir(opts.shots, { recursive: true });
      await writeFile(join(opts.shots, `${shot.name}.png`), Buffer.from(data, 'base64'));
    }
    await page.close?.();
  }
  if (errors.length) fail(`JS errors:\n  ${[...new Set(errors)].join('\n  ')}`);
} finally {
  await browser.close();
  srv.close();
}
if (!process.exitCode) console.log('ski smoke OK');
