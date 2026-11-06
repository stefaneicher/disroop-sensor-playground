// Minimal Chrome DevTools Protocol client over --remote-debugging-pipe (fd 3 = to browser, fd 4 = from browser).
import { spawn } from 'node:child_process';

export async function launchBrowser({ executable = process.env.CHROMIUM ?? 'chromium', args = [] } = {}) {
  const proc = spawn(executable, [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
    '--hide-scrollbars', '--remote-debugging-pipe', ...args, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d; });

  const [toBrowser, fromBrowser] = [proc.stdio[3], proc.stdio[4]];
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  let buffer = '';
  fromBrowser.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const msg = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`)); else resolve(msg.result);
      } else {
        listeners.forEach((fn) => fn(msg));
      }
    }
  });
  const exited = new Promise((resolve) => proc.on('exit', resolve));
  exited.then(() => pending.forEach(({ reject }) => reject(new Error(`browser exited\n${stderr.slice(-2000)}`))));

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    toBrowser.write(`${JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) })}\0`);
  });

  async function newPage() {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    return {
      send: (method, params) => send(method, params, sessionId),
      on: (method, fn) => listeners.add((m) => { if (m.sessionId === sessionId && m.method === method) fn(m.params); }),
    };
  }

  async function close() {
    try { await Promise.race([send('Browser.close'), exited]); } catch { /* already gone */ }
    if (proc.exitCode === null) proc.kill('SIGKILL');
    await exited;
  }

  return { newPage, close };
}
