import { backoffDelay } from './backoff.js';
import { parseJson } from './state.js';

// SSE client for /api/stream. EventSource reconnects by itself while CONNECTING;
// once the browser gives up (CLOSED), we reopen with exponential backoff.
export function connectStream(url, {
  EventSource = globalThis.EventSource,
  setTimeout = globalThis.setTimeout,
  onOpen, onError, onTelemetry, onLog,
}) {
  let es = null;
  let attempt = 0;
  let closed = false;

  function open() {
    es = new EventSource(url);
    es.addEventListener('open', () => { attempt = 0; onOpen?.(); });
    es.addEventListener('telemetry', (e) => {
      const snapshot = parseJson(e.data);
      if (snapshot) onTelemetry?.(snapshot);
    });
    es.addEventListener('log', (e) => {
      const msg = parseJson(e.data)?.msg;
      if (msg !== undefined) onLog?.(msg);
    });
    es.addEventListener('error', () => {
      onError?.();
      if (es.readyState !== EventSource.CLOSED || closed) return;
      setTimeout(() => { if (!closed) open(); }, backoffDelay(attempt++));
    });
  }

  open();
  return { close() { closed = true; es.close(); } };
}
