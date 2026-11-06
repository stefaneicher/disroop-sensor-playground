// Pure reducer for the dashboard: connection state, latest snapshot, log.
export const STALE_MS = 3000;
export const LOG_LIMIT = 200;

export const initialState = () => ({
  sseOpen: false,
  attempts: 0,
  snapshot: null,
  lastTelemetryAt: null,
  newTap: false,
  log: [],
});

export function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

const HANDLERS = {
  open: (s) => ({ ...s, sseOpen: true, attempts: 0 }),
  error: (s) => ({ ...s, sseOpen: false, attempts: s.attempts + 1 }),
  telemetry: (s, { snapshot, now }) => ({
    ...s,
    sseOpen: true,
    snapshot,
    lastTelemetryAt: now,
    newTap: Boolean(snapshot?.motion?.tap) && snapshot.motion.tap.ts !== s.snapshot?.motion?.tap?.ts,
  }),
  log: (s, { msg, now }) => ({ ...s, log: [{ msg: String(msg), at: now }, ...s.log].slice(0, LOG_LIMIT) }),
};

export function reduce(state, action) {
  const handler = HANDLERS[action?.type];
  return handler ? handler(state, action) : state;
}

const LABELS = {
  connecting: 'Verbinde …',
  reconnecting: 'Verbindung wird wiederhergestellt …',
  stale: 'Keine neuen Daten',
  'device-offline': 'Thingy nicht verbunden',
  live: 'Live',
};

function status(s, now) {
  if (!s.sseOpen) return s.attempts > 0 ? 'reconnecting' : 'connecting';
  if (s.lastTelemetryAt === null) return 'connecting';
  if (now - s.lastTelemetryAt > STALE_MS) return 'stale';
  if (s.snapshot?.connected === false) return 'device-offline';
  return 'live';
}

export function connectionView(s, now) {
  const st = status(s, now);
  return {
    status: st,
    label: LABELS[st],
    stale: s.lastTelemetryAt !== null && now - s.lastTelemetryAt > STALE_MS,
    source: s.snapshot?.device?.source ?? null,
    deviceConnected: s.snapshot ? s.snapshot.connected !== false : false,
  };
}
