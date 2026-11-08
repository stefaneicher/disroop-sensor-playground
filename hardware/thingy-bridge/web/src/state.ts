import type { Snapshot } from './telemetry.ts';

// Pure reducer for the dashboard: connection state, latest snapshot, log.
export const STALE_MS = 3000;
export const LOG_LIMIT = 200;

export interface LogEntry { msg: string; at: number }
export interface State {
  sseOpen: boolean;
  attempts: number;
  snapshot: Snapshot | null;
  lastTelemetryAt: number | null;
  newTap: boolean;
  log: LogEntry[];
}

export type Action =
  | { type: 'open'; now: number }
  | { type: 'error'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'telemetry'; snapshot: Snapshot; now: number }
  | { type: 'log'; msg: string; now: number };

export type Status = 'connecting' | 'reconnecting' | 'stale' | 'device-offline' | 'live';
export interface ConnectionView {
  status: Status;
  label: string;
  stale: boolean;
  source: Snapshot['device']['source'] | null;
  deviceConnected: boolean;
}

export const initialState = (): State => ({
  sseOpen: false,
  attempts: 0,
  snapshot: null,
  lastTelemetryAt: null,
  newTap: false,
  log: [],
});

export function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'open': return { ...state, sseOpen: true, attempts: 0 };
    case 'error': return { ...state, sseOpen: false, attempts: state.attempts + 1 };
    case 'telemetry': {
      const tap = action.snapshot.motion?.tap;
      return {
        ...state,
        sseOpen: true,
        snapshot: action.snapshot,
        lastTelemetryAt: action.now,
        newTap: Boolean(tap) && tap?.ts !== state.snapshot?.motion?.tap?.ts,
      };
    }
    case 'log': return { ...state, log: [{ msg: String(action.msg), at: action.now }, ...state.log].slice(0, LOG_LIMIT) };
    default: return state;
  }
}

const LABELS: Record<Status, string> = {
  connecting: 'Verbinde …',
  reconnecting: 'Verbindung wird wiederhergestellt …',
  stale: 'Keine neuen Daten',
  'device-offline': 'Thingy nicht verbunden',
  live: 'Live',
};

function status(s: State, now: number): Status {
  if (!s.sseOpen) return s.attempts > 0 ? 'reconnecting' : 'connecting';
  if (s.lastTelemetryAt === null) return 'connecting';
  if (now - s.lastTelemetryAt > STALE_MS) return 'stale';
  if (s.snapshot?.connected === false) return 'device-offline';
  return 'live';
}

export function connectionView(s: State, now: number): ConnectionView {
  const st = status(s, now);
  return {
    status: st,
    label: LABELS[st],
    stale: s.lastTelemetryAt !== null && now - s.lastTelemetryAt > STALE_MS,
    source: s.snapshot?.device?.source ?? null,
    deviceConnected: s.snapshot ? s.snapshot.connected !== false : false,
  };
}
