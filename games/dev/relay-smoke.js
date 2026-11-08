// Headless Chromium check of the phone mode against a running relay (relay/): screen shows a room + QR code,
// a pad page joins with the code, its frames reach the game (badge HANDY), the player appears in the panel.
// Usage (repo root): node games/dev/relay-smoke.js --url http://127.0.0.1:8080 [--shots docs/img]
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { launchBrowser } from './cdp.js';

const { values: opts } = parseArgs({ options: { url: { type: 'string' }, shots: { type: 'string' } } });
if (!opts.url) throw new Error('--url fehlt');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (m) => {
  console.error(`FAIL ${m}`);
  process.exitCode = 1;
};

// Screen and pad each get their own browser: a background tab would be throttled (timers ~1 Hz).
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await launchBrowser({ args: ARGS });
const padBrowser = await launchBrowser({ args: ARGS });
const errors = [];
async function open(url, width, height, mobile, b = browser) {
  const page = await b.newPage();
  await page.send('Runtime.enable');
  page.on('Runtime.exceptionThrown', (e) => errors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text));
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await page.send('Page.navigate', { url });
  page.eval = async (expression) => {
    const { result, exceptionDetails } = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  return page;
}
async function waitFor(page, expr, what, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await page.eval(expr).catch(() => null);
    if (v) return v;
    await sleep(200);
  }
  fail(what);
  return null;
}
async function shot(page, name) {
  if (!opts.shots) return;
  await mkdir(opts.shots, { recursive: true });
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(opts.shots, `${name}.png`), Buffer.from(data, 'base64'));
  console.log(`  ${name}.png`);
}

try {
  const screen = await open(`${opts.url}/games/ski/?relay=same&nohint`, 1280, 720, false);
  const room = await waitFor(screen, `document.querySelector('.relay-panel .code')?.textContent`, 'screen shows no room code');
  const qr = await screen.eval(`!!document.querySelector('.relay-panel .qr svg')`);
  if (!qr) fail('no QR code');
  console.log(`room ${room}, QR ${qr}`);
  await shot(screen, 'relay-screen');

  const pad = await open(`${opts.url}/games/pad/?room=${room}`, 844, 390, true, padBrowser);
  await waitFor(pad, `document.getElementById('room')?.value === ${JSON.stringify(room)}`, 'pad did not take the room from the URL');
  await pad.eval(`document.getElementById('name').value = 'Smoke'; document.getElementById('go').click(); true`);
  await waitFor(pad, `document.getElementById('who').textContent === 'Smoke'`, 'pad got no welcome');
  await waitFor(pad, `/Hz/.test(document.getElementById('rate').textContent)`, 'pad sends no frames');
  const rate = await pad.eval(`document.getElementById('rate').textContent`);
  console.log(`pad: ${rate}`);
  await shot(pad, 'relay-pad');

  await waitFor(screen, `document.getElementById('badge')?.textContent === 'HANDY'`, 'screen badge is not HANDY');
  await waitFor(screen, `document.querySelector('.relay-panel')?.textContent.includes('Smoke')`, 'player not shown on screen');
  const status = await (await fetch(`${opts.url}/api/status`)).json();
  if (status.pads !== 1) fail(`api/status pads=${status.pads}`);
  await shot(screen, 'relay-screen-playing');

  await padBrowser.close();
  await waitFor(screen, `!document.querySelector('.relay-panel')?.textContent.includes('Smoke')`, 'player not removed after leaving');
} finally {
  await browser.close();
  await padBrowser.close().catch(() => undefined);
}
if (errors.length) fail(`JS errors:\n${errors.join('\n')}`);
if (!process.exitCode) console.log('relay smoke OK');
