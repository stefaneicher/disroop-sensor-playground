// Smoke test: headless Chromium loads the dashboard against the mock bridge (or SMOKE_URL, e.g. thingy.exe in sim mode),
// waits for live values, exercises song + LED controls and fails on any JS error.
// Usage: node bridge/web/dev/smoke.js [--url http://host:port/] [--screenshot build/dashboard.png]
import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { startMockServer } from './mock-server.js';
import { launchBrowser } from './cdp.js';

const { values: opts } = parseArgs({ options: { url: { type: 'string' }, screenshot: { type: 'string' } } });
const TIMEOUT_MS = 15000;
const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const READ_PAGE = `JSON.stringify({
  status: document.getElementById('status-label').textContent,
  bodyClass: document.body.className,
  source: document.getElementById('source').textContent,
  temperature: document.getElementById('temperature').textContent,
  humidity: document.getElementById('humidity').textContent,
  pressure: document.getElementById('pressure').textContent,
  eco2: document.getElementById('eco2').textContent,
  co2Level: document.getElementById('co2-tile').dataset.level,
  heading: document.getElementById('heading').textContent,
  steps: document.getElementById('steps').textContent,
  level: document.getElementById('level').textContent,
  battery: document.getElementById('battery').textContent,
  cube: document.getElementById('cube').style.transform,
  notes: document.getElementById('notes').children.length,
  logEntries: document.getElementById('log').children.length,
  songButton: document.getElementById('song-button').getAttribute('aria-pressed'),
  songProgress: document.getElementById('song-progress').textContent,
  led: document.getElementById('led-swatch').style.backgroundColor,
  overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
})`;

const CHECKS = {
  live: (p) => p.status === 'Live' && p.bodyClass.includes('is-live'),
  source: (p) => /SIMULATOR|BLE/.test(p.source),
  temperature: (p) => /^-?\d+\.\d$/.test(p.temperature),
  humidity: (p) => /^\d+$/.test(p.humidity),
  pressure: (p) => /^\d+\.\d$/.test(p.pressure),
  eco2: (p) => /^\d+$/.test(p.eco2) && ['good', 'warn', 'bad'].includes(p.co2Level),
  heading: (p) => /^\d+°$/.test(p.heading),
  steps: (p) => /^\d+$/.test(p.steps),
  level: (p) => /dBFS$/.test(p.level),
  battery: (p) => /^\d+ %$/.test(p.battery),
  cube: (p) => p.cube.startsWith('matrix3d('),
  notes: (p) => p.notes === 24,
  log: (p) => p.logEntries > 0,
};

async function waitFor(page, predicate, what) {
  const deadline = Date.now() + TIMEOUT_MS;
  let last;
  while (Date.now() < deadline) {
    const { result } = await page.send('Runtime.evaluate', { expression: READ_PAGE, returnByValue: true });
    last = JSON.parse(result.value);
    if (predicate(last)) return last;
    await sleep(200);
  }
  throw new Error(`timeout waiting for ${what}; page state: ${JSON.stringify(last, null, 1)}`);
}

const click = (page, selector) => page.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)}).click()` });

async function screenshot(page, metrics, path) {
  await page.send('Emulation.setDeviceMetricsOverride', metrics);
  await sleep(1500);
  const { result } = await page.send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true });
  const clip = { x: 0, y: 0, width: metrics.width, height: result.value, scale: 1 };
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
  await writeFile(path, Buffer.from(data, 'base64'));
  console.log(`  screenshot ${path} (${metrics.width}×${result.value})`);
}

async function main() {
  let mock = opts.url ? null : await startMockServer({ port: 0 });
  const url = opts.url ?? `http://127.0.0.1:${mock.port}/`;
  const browser = await launchBrowser();
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('Runtime.exceptionThrown', (e) => errors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text));
    page.on('Runtime.consoleAPICalled', (e) => { if (e.type === 'error') errors.push(`console.error: ${e.args.map((a) => a.value ?? a.description).join(' ')}`); });
    page.on('Log.entryAdded', (e) => { if (e.entry.level === 'error') errors.push(`${e.entry.source}: ${e.entry.text} ${e.entry.url ?? ''}`); });
    await Promise.all(['Runtime.enable', 'Log.enable', 'Page.enable'].map((m) => page.send(m)));
    await page.send('Emulation.setDeviceMetricsOverride', DESKTOP);
    await page.send('Page.navigate', { url });

    const state = await waitFor(page, (p) => Object.values(CHECKS).every((c) => c(p)), 'live values');
    console.log(`  live: ${state.temperature} °C, eCO₂ ${state.eco2} ppm (${state.co2Level}), heading ${state.heading}, ${state.level}`);

    await click(page, '#song-button');
    const playing = await waitFor(page, (p) => p.songButton === 'true' && /^Note \d+ \/ 24/.test(p.songProgress), 'song playing');
    console.log(`  song: ${playing.songProgress}`);
    await click(page, '#song-button');
    await waitFor(page, (p) => p.songButton === 'false', 'song stopped');

    await click(page, '[data-led="#ff0000"]');
    await waitFor(page, (p) => p.led === 'rgb(255, 0, 0)', 'LED red');
    console.log('  LED: rot gesetzt');

    for (const metrics of [DESKTOP, MOBILE]) {
      await page.send('Emulation.setDeviceMetricsOverride', metrics);
      await sleep(300);
      const p = await waitFor(page, () => true, 'layout');
      if (p.overflowX > 0) throw new Error(`horizontal overflow of ${p.overflowX}px at ${metrics.width}px width`);
    }
    if (mock) {
      const { port } = mock;
      await mock.close();
      mock = null;
      await waitFor(page, (p) => /is-(reconnecting|stale)/.test(p.bodyClass), 'reconnecting state after bridge stop');
      mock = await startMockServer({ port });
      await waitFor(page, CHECKS.live, 'live again after bridge restart');
      console.log('  reconnect: OK');
    }
    if (opts.screenshot) {
      await screenshot(page, DESKTOP, opts.screenshot);
      await screenshot(page, MOBILE, opts.screenshot.replace(/(\.png)?$/, '-mobile.png'));
    }
    if (errors.length) throw new Error(`JS errors:\n${errors.join('\n')}`);
  } finally {
    await browser.close();
    await mock?.close();
  }
}

main().then(
  () => console.log('web smoke: OK'),
  (err) => { console.error(`web smoke: FAILED\n${err.stack ?? err}`); process.exit(1); },
);
