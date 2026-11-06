// Dependency-free stand-in for the Go bridge API (docs/protocol.md §2), backed by the simulator.
// Usage: node bridge/web/dev/mock-server.js [--port 8053] [--host 127.0.0.1]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createSim } from './sim.js';

const STATIC_DIR = fileURLToPath(new URL('../static/', import.meta.url));
const CHORUS = JSON.parse(readFileSync(new URL('../../../shared/chorus.json', import.meta.url), 'utf8'));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
};
const STREAM_INTERVAL_MS = 100;
const LOG_INTERVAL_MS = 5000;

const isByte = (v) => Number.isInteger(v) && v >= 0 && v <= 255;

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  try { return JSON.parse(body); } catch { return null; }
}

function send(res, status, body = '', type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

export function startMockServer({ port = 8053, host = '127.0.0.1', now = () => Date.now() } = {}) {
  const sim = createSim({ chorus: CHORUS, startTs: now() });
  const clients = new Set();
  const broadcast = (event, data) => {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(frame);
  };
  const log = (msg) => broadcast('log', { msg });

  const routes = {
    'GET /healthz': (_req, res) => send(res, 200, 'ok'),
    'GET /api/state': (_req, res) => send(res, 200, JSON.stringify(sim.snapshot(now())), 'application/json'),
    'GET /api/stream': (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 1000\n\n');
      res.write(`event: log\ndata: ${JSON.stringify({ msg: 'Simulator verbunden (Mock-Server)' })}\n\n`);
      res.write(`event: telemetry\ndata: ${JSON.stringify(sim.snapshot(now()))}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
    },
    'POST /api/song': async (req, res) => {
      const body = await readJson(req);
      if (!body || !['play', 'stop'].includes(body.action)) return send(res, 400, 'action must be play|stop');
      const volume = Number.isInteger(body.volume) ? Math.max(0, Math.min(100, body.volume)) : 100;
      sim.song(body.action, volume, now());
      log(body.action === 'play' ? `Lied startet (Lautstärke ${volume})` : 'Lied gestoppt');
      return send(res, 202);
    },
    'POST /api/led': async (req, res) => {
      const body = await readJson(req);
      if (!body || ![body.r, body.g, body.b].every(isByte)) return send(res, 400, 'r, g, b must be 0..255');
      sim.led(body);
      log(`LED gesetzt auf ${body.r}, ${body.g}, ${body.b}`);
      return send(res, 204);
    },
  };

  async function serveStatic(req, res) {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(STATIC_DIR, path.endsWith('/') ? `${path}index.html` : path));
    if (!file.startsWith(STATIC_DIR.replace(/[\\/]$/, '') + sep)) return send(res, 403, 'forbidden');
    try {
      send(res, 200, await readFile(file), TYPES[extname(file)] ?? 'application/octet-stream');
    } catch {
      send(res, 404, 'not found');
    }
  }

  const server = http.createServer((req, res) => {
    const route = routes[`${req.method} ${new URL(req.url, 'http://x').pathname}`];
    if (route) return route(req, res);
    if (req.method === 'GET') return serveStatic(req, res);
    return send(res, 405, 'method not allowed');
  });

  const ticker = setInterval(() => broadcast('telemetry', sim.snapshot(now())), STREAM_INTERVAL_MS);
  let logCount = 0;
  const logger = setInterval(() => log(`Simulator: ${++logCount * (LOG_INTERVAL_MS / 1000)} s Daten gesendet`), LOG_INTERVAL_MS);
  server.on('close', () => { clearInterval(ticker); clearInterval(logger); });
  const close = () => new Promise((resolve) => {
    for (const res of clients) res.end();
    server.close(resolve);
    server.closeAllConnections();
  });

  return new Promise((resolve) => server.listen(port, host, () => resolve({ server, port: server.address().port, close })));
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { port: { type: 'string', default: '8053' }, host: { type: 'string', default: '127.0.0.1' } } });
  const { port } = await startMockServer({ port: Number(values.port), host: values.host });
  console.log(`Mock-Bridge läuft: http://localhost:${port}/`);
}
