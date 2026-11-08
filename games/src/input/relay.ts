/**
 * Relay protocol (relay/README.md): the game screen opens a room, phones ("pads") join it via QR code.
 * Pure helpers (parsing, URLs) are separated from the WebSocket client so they can be unit-tested.
 */
import { parseFrame, type MotionFrame } from './motion.ts';

export interface PadInfo {
  pad: number;
  name: string;
  color: string;
}

export type RelayMsg =
  | { type: 'room'; room: string }
  | ({ type: 'join' } & PadInfo)
  | { type: 'leave'; pad: number }
  | { type: 'frame'; pad: number; f: MotionFrame }
  | ({ type: 'welcome'; room: string } & PadInfo)
  | { type: 'feedback'; kind: string }
  | { type: 'error'; text: string };

const str = (v: unknown): v is string => typeof v === 'string';
const int = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/** Validates one relay message; unknown or malformed messages give null. */
export function parseRelayMessage(text: string): RelayMsg | null {
  let o: Record<string, unknown>;
  try {
    const v: unknown = JSON.parse(text);
    if (typeof v !== 'object' || v === null) return null;
    o = v as Record<string, unknown>;
  } catch {
    return null;
  }
  switch (o.type) {
    case 'room':
      return str(o.room) ? { type: 'room', room: o.room } : null;
    case 'join':
      return int(o.pad) && str(o.name) && str(o.color) ? { type: 'join', pad: o.pad, name: o.name, color: o.color } : null;
    case 'leave':
      return int(o.pad) ? { type: 'leave', pad: o.pad } : null;
    case 'frame': {
      const f = parseFrame(JSON.stringify(o.f ?? null));
      return int(o.pad) && f ? { type: 'frame', pad: o.pad, f } : null;
    }
    case 'welcome':
      return str(o.room) && int(o.pad) && str(o.name) && str(o.color)
        ? { type: 'welcome', room: o.room, pad: o.pad, name: o.name, color: o.color }
        : null;
    case 'feedback':
      return { type: 'feedback', kind: str(o.kind) ? o.kind : '' };
    case 'error':
      return { type: 'error', text: str(o.text) ? o.text : 'Fehler' };
    default:
      return null;
  }
}

/**
 * Relay base URL from the `relay` query parameter: empty or "same" = the page's own origin
 * (page served by the relay), otherwise a host, http(s):// or ws(s):// URL. Returns the http(s) origin.
 */
export function relayOrigin(param: string, pageOrigin: string): string {
  const p = param.trim();
  if (p === '' || p === 'same') return pageOrigin;
  const withScheme = /^[a-z]+:\/\//i.test(p) ? p : `https://${p}`;
  const u = new URL(withScheme);
  u.protocol = u.protocol === 'ws:' ? 'http:' : u.protocol === 'wss:' ? 'https:' : u.protocol;
  return u.origin;
}

/** WebSocket URL on the relay for a path such as /ws/screen. */
export function relayWs(origin: string, path: string): string {
  const u = new URL(path, origin);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return u.toString();
}

/** URL the QR code points to: the pad page served by the relay itself. */
export function padUrl(origin: string, room: string): string {
  const u = new URL('/games/pad/', origin);
  u.searchParams.set('room', room);
  return u.toString();
}

export interface ScreenEvents {
  room(code: string): void;
  join(p: PadInfo): void;
  leave(pad: number): void;
  frame(pad: number, f: MotionFrame): void;
  closed(): void;
}

/** Screen side: opens a room, reconnects (with a new room) when the connection drops. */
export class RelayScreen {
  private ws: WebSocket | null = null;
  private retry = 1000;
  private readonly url: string;
  private readonly on: ScreenEvents;

  constructor(origin: string, on: ScreenEvents) {
    this.url = relayWs(origin, '/ws/screen');
    this.on = on;
  }

  start(): void {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onmessage = (m) => {
      const msg = typeof m.data === 'string' ? parseRelayMessage(m.data) : null;
      if (!msg) return;
      if (msg.type === 'room') {
        this.retry = 1000;
        this.on.room(msg.room);
      } else if (msg.type === 'join') this.on.join(msg);
      else if (msg.type === 'leave') this.on.leave(msg.pad);
      else if (msg.type === 'frame') this.on.frame(msg.pad, msg.f);
    };
    ws.onclose = () => {
      this.ws = null;
      this.on.closed();
      setTimeout(() => this.start(), this.retry);
      this.retry = Math.min(10000, this.retry * 2);
    };
  }

  /** Vibration/feedback on one pad (0 = all pads). */
  feedback(pad: number, kind: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'feedback', pad, kind }));
  }
}
