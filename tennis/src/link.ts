/** Connection to the bridge: /api/motion (WebSocket), /api/state (source), /api/beep (hit feedback). */
import { parseFrame, type MotionFrame } from './core/motion.ts';

export type LinkStatus = 'connecting' | 'open' | 'closed';
export type Source = 'ble' | 'sim' | null;

const base = (): URL => new URL('..', location.href); // the game lives under /tennis/

export class MotionLink {
  status: LinkStatus = 'connecting';
  source: Source = null;
  frames = 0;
  private ws: WebSocket | null = null;
  private retry = 500;
  private lastBeep = 0;

  private readonly onFrame: (f: MotionFrame) => void;

  constructor(onFrame: (f: MotionFrame) => void) {
    this.onFrame = onFrame;
  }

  start(): void {
    if (location.protocol === 'file:') {
      this.status = 'closed';
      return;
    }
    this.connect();
    void this.pollSource();
    setInterval(() => void this.pollSource(), 5000);
  }

  private connect(): void {
    const u = base();
    u.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/api/motion';
    const ws = new WebSocket(u);
    this.ws = ws;
    this.status = 'connecting';
    ws.onopen = () => {
      this.status = 'open';
      this.retry = 500;
    };
    ws.onmessage = (m) => {
      const f = typeof m.data === 'string' ? parseFrame(m.data) : null;
      if (!f) return;
      this.frames++;
      this.onFrame(f);
    };
    ws.onclose = () => {
      this.status = 'closed';
      this.ws = null;
      setTimeout(() => this.connect(), this.retry);
      this.retry = Math.min(8000, this.retry * 2);
    };
  }

  private async pollSource(): Promise<void> {
    try {
      const r = await fetch(new URL('/api/state', base()), { cache: 'no-store' });
      const s = (await r.json()) as { connected?: boolean; device?: { source?: string } };
      this.source = s.device?.source === 'sim' ? 'sim' : s.connected ? 'ble' : null;
    } catch {
      this.source = null;
    }
  }

  /** Short tone + LED on the Thingy (rate-limited here and in the bridge). */
  beep(kind: 'hit' | 'point' | 'miss'): void {
    const now = performance.now();
    if (this.status !== 'open' || now - this.lastBeep < 120) return;
    this.lastBeep = now;
    fetch(new URL('/api/beep', base()), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) }).catch(
      () => undefined,
    );
  }
}
