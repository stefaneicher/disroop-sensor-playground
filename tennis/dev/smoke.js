// Headless Chromium check of the built game (tennis/dist): WebGL renders, no JS errors, the demo rally runs.
// Usage (repo root): node tennis/dev/smoke.js [--url http://127.0.0.1:8060/tennis/] [--expect-sim] [--screenshot docs/img/tennis.png]
// Without --url a static server for tennis/dist is started (no bridge: keyboard mode).
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { launchBrowser } from './cdp.js';

const { values: opts } = parseArgs({
  options: { url: { type: 'string' }, screenshot: { type: 'string' }, 'expect-sim': { type: 'boolean' }, cam: { type: 'string' } },
});
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function staticServer() {
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
  return { srv, url: `http://127.0.0.1:${srv.address().port}/` };
}

const fail = (msg) => {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
};

async function main() {
  const local = opts.url ? null : await staticServer();
  const base = opts.url ?? local.url;
  const cam = opts.cam ?? 'third';
  const browser = await launchBrowser({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    await page.send('Runtime.enable');
    page.on('Runtime.exceptionThrown', (e) => errors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text));
    page.on('Runtime.consoleAPICalled', (e) => {
      if (e.type === 'error') errors.push(`console.error: ${e.args.map((a) => a.value ?? a.description).join(' ')}`);
    });
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    const url = `${base}?demo=1&nohint&cam=${cam}`;
    await page.send('Page.navigate', { url });
    const evalJs = async (expression) => {
      const { result, exceptionDetails } = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    };
    // software WebGL (swiftshader) is slow to start: wait for the game clock instead of a fixed time
    for (let i = 0; i < 120; i++) {
      await sleep(250);
      const t = await evalJs('window.tennis ? window.tennis.game().t : 0').catch(() => 0);
      if (t > 2 && (!opts['expect-sim'] || i > 8)) break;
    }
    const st = await evalJs(`(() => {
      const t = window.tennis; if (!t) return null;
      const c = document.querySelector('#stage canvas');
      const probe = document.createElement('canvas'); probe.width = 64; probe.height = 36;
      const ctx = probe.getContext('2d'); ctx.drawImage(c, 0, 0, 64, 36);
      const px = ctx.getImageData(0, 0, 64, 36).data; const colours = new Set();
      for (let i = 0; i < px.length; i += 4) colours.add((px[i] >> 4) + ',' + (px[i+1] >> 4) + ',' + (px[i+2] >> 4));
      return { t: t.game().t, hits: t.game().score, frames: t.link.frames, status: t.link.status, source: t.link.source,
               colours: colours.size, badge: document.getElementById('badge').textContent, points: document.getElementById('sc-points').textContent,
               gl: !!c.getContext('webgl2') };
    })()`);
    console.log('state', JSON.stringify({ ...st, hits: undefined }));
    if (!st) fail('window.tennis missing (module did not start)');
    else {
      if (st.t < 1.5) fail(`game clock did not run (${st.t})`);
      if (st.colours < 12) fail(`canvas looks blank (${st.colours} colours)`);
      if (!st.points) fail('score missing');
      if (opts['expect-sim']) {
        const f0 = st.frames;
        await sleep(2000);
        const f1 = await evalJs('window.tennis.link.frames');
        const rate = (f1 - f0) / 2;
        console.log(`motion frames in the browser: ${rate.toFixed(0)}/s, badge ${st.badge}`);
        if (rate < 50) fail(`motion rate ${rate}/s < 50`);
        if (st.badge !== 'SIM') fail(`badge ${st.badge}, want SIM`);
      } else if (st.badge !== 'TASTATUR') fail(`badge ${st.badge}, want TASTATUR`);
    }
    if (errors.length) fail(`JS errors:\n  ${errors.join('\n  ')}`);
    if (opts.screenshot) {
      // wait for a moment with the ball in flight between the players
      for (let i = 0; i < 80; i++) {
        const ok = await evalJs('(() => { const g = window.tennis.game(); return g.phase === "rally" && g.ball.p[1] > 0.8 && g.ball.p[2] > -2 && g.ball.p[2] < 6; })()');
        if (ok) break;
        await sleep(50);
      }
      const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
      await mkdir(dirname(opts.screenshot), { recursive: true });
      await writeFile(opts.screenshot, Buffer.from(data, 'base64'));
      console.log(`screenshot ${opts.screenshot}`);
    }
  } finally {
    await browser.close();
    local?.srv.close();
  }
  if (!process.exitCode) console.log('tennis smoke OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
