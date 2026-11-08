/**
 * Connection to the motion source:
 * - the bridge (thingy.exe): /api/motion (WebSocket), /api/state (source), /api/beep (hit feedback);
 * - inside the Android app: the native BLE bridge `window.ThingyNative`;
 * - with `?relay=` in the URL: phones via the relay server (QR code on screen, relay/README.md).
 */
import { parseFrame, type MotionFrame } from './motion.ts';
import { relayOrigin, RelayScreen, type PadInfo } from './relay.ts';

export type LinkStatus = 'connecting' | 'open' | 'closed';
export type Source = 'ble' | 'sim' | 'phone' | null;

/** State of the phone mode, for the QR panel. */
export interface RelayState {
  origin: string;
  room: string | null;
  pads: PadInfo[];
  active: number | null; // pad that controls the player (first one that joined)
}

/** Injected by the Android app (TennisActivity); it pushes frames and link state into the page. */
interface NativeBridge { beep(kind: string): void }
declare global {
  interface Window {
    ThingyNative?: NativeBridge;
    __thingyFrame?: (frame: unknown) => void;
    __thingyLink?: (source: Source, text: string) => void;
  }
}
export const isNative = (): boolean => typeof window !== 'undefined' && window.ThingyNative !== undefined;

// the games live under /tennis/ and /tennis/ski/; the API sits at the bridge root
const base = (): URL => new URL(location.pathname.includes('/ski/') ? '../..' : '..', location.href);

export class MotionLink {
  status: LinkStatus = 'connecting';
  source: Source = null;
  frames = 0;
  private ws: WebSocket | null = null;
  private retry = 500;
  private lastBeep = 0;

  relay: RelayState | null = null;
  /** Called when room or players change (phone mode). */
  onRelayChange: (() => void) | null = null;
  private relayScreen: RelayScreen | null = null;

  private readonly onFrame: (f: MotionFrame) => void;

  constructor(onFrame: (f: MotionFrame) => void) {
    this.onFrame = onFrame;
  }

  start(): void {
    if (isNative()) return this.startNative();
    const relay = new URLSearchParams(location.search).get('relay');
    if (relay !== null) return this.startRelay(relay);
    if (location.protocol === 'file:') {
      this.status = 'closed';
      return;
    }
    this.connect();
    void this.pollSource();
    setInterval(() => void this.pollSource(), 5000);
  }

  private startNative(): void {
    this.status = 'open';
    document.documentElement.classList.add('native');
    window.__thingyFrame = (raw) => {
      const f = parseFrame(JSON.stringify(raw));
      if (!f) return;
      this.frames++;
      this.onFrame(f);
    };
    window.__thingyLink = (source) => {
      this.source = source;
    };
  }

  private startRelay(param: string): void {
    let origin: string;
    try {
      origin = relayOrigin(param, location.origin);
    } catch {
      this.status = 'closed';
      return;
    }
    const st: RelayState = { origin, room: null, pads: [], active: null };
    this.relay = st;
    const changed = (): void => {
      this.source = st.active !== null ? 'phone' : null;
      this.onRelayChange?.();
    };
    this.relayScreen = new RelayScreen(origin, {
      room: (code) => {
        Object.assign(st, { room: code, pads: [], active: null });
        this.status = 'open';
        changed();
      },
      join: (p) => {
        st.pads.push(p);
        if (st.active === null) st.active = p.pad;
        changed();
      },
      leave: (pad) => {
        st.pads = st.pads.filter((p) => p.pad !== pad);
        if (st.active === pad) st.active = st.pads[0]?.pad ?? null;
        changed();
      },
      frame: (pad, f) => {
        if (pad !== st.active) return;
        this.frames++;
        this.onFrame(f);
      },
      closed: () => {
        this.status = 'connecting';
        Object.assign(st, { room: null, pads: [], active: null });
        changed();
      },
    });
    this.relayScreen.start();
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
    if (this.relayScreen) {
      if (this.relay?.active != null) this.relayScreen.feedback(this.relay.active, kind);
      return;
    }
    if (window.ThingyNative) {
      window.ThingyNative.beep(kind);
      return;
    }
    fetch(new URL('/api/beep', base()), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) }).catch(
      () => undefined,
    );
  }
}
