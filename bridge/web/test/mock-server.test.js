import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startMockServer } from '../dev/mock-server.js';

let srv;
let base;
before(async () => { srv = await startMockServer({ port: 0 }); base = `http://127.0.0.1:${srv.port}`; });
after(() => srv.close());

const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('healthz and state', async () => {
  assert.equal(await (await fetch(`${base}/healthz`)).text(), 'ok');
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.device.source, 'sim');
});

test('serves the dashboard and blocks path traversal', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.equal((await fetch(`${base}/..%2f..%2fdev%2fsim.js`)).status, 403);
});

test('song and led endpoints follow the protocol status codes', async () => {
  assert.equal((await post('/api/song', { action: 'play', volume: 50 })).status, 202);
  assert.equal((await (await fetch(`${base}/api/state`)).json()).sound.song.playing, true);
  assert.equal((await post('/api/song', { action: 'dance' })).status, 400);
  assert.equal((await post('/api/led', { r: 1, g: 2, b: 3 })).status, 204);
  assert.deepEqual((await (await fetch(`${base}/api/state`)).json()).ui.led, { r: 1, g: 2, b: 3 });
  assert.equal((await post('/api/led', { r: 300, g: 0, b: 0 })).status, 400);
});

test('stream delivers telemetry events', async () => {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/api/stream`, { signal: ctrl.signal });
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const reader = res.body.getReader();
  let text = '';
  while (!text.includes('event: telemetry')) text += new TextDecoder().decode((await reader.read()).value);
  ctrl.abort();
  assert.match(text, /event: telemetry\ndata: \{"ts"/);
});
