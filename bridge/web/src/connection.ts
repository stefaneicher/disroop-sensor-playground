import { backoffDelay } from './backoff.ts';
import { parseJson } from './state.ts';
import type { Snapshot } from './telemetry.ts';

interface EventSourceLike {
  readyState: number;
  addEventListener(type: string, listener: (e: { data?: string }) => void): void;
  close(): void;
}
export interface EventSourceCtor { new (url: string): EventSourceLike; readonly CLOSED: number }

export interface StreamOptions {
  EventSource?: EventSourceCtor;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  onOpen?: () => void;
  onError?: () => void;
  onTelemetry?: (snapshot: Snapshot) => void;
  onLog?: (msg: string) => void;
}

// SSE client for /api/stream. EventSource reconnects by itself while CONNECTING;
// once the browser gives up (CLOSED), we reopen with exponential backoff.
export function connectStream(url: string, {
  EventSource = globalThis.EventSource as unknown as EventSourceCtor,
  setTimeout = globalThis.setTimeout,
  onOpen, onError, onTelemetry, onLog,
}: StreamOptions): { close(): void } {
  let es: EventSourceLike;
  let attempt = 0;
  let closed = false;

  function open(): void {
    const source = new EventSource(url);
    es = source;
    source.addEventListener('open', () => { attempt = 0; onOpen?.(); });
    source.addEventListener('telemetry', (e) => {
      const snapshot = parseJson(e.data ?? '');
      if (snapshot && typeof snapshot === 'object') onTelemetry?.(snapshot as Snapshot);
    });
    source.addEventListener('log', (e) => {
      const msg = (parseJson(e.data ?? '') as { msg?: unknown } | null)?.msg;
      if (msg !== undefined) onLog?.(String(msg));
    });
    source.addEventListener('error', () => {
      onError?.();
      if (source.readyState !== EventSource.CLOSED || closed) return;
      setTimeout(() => { if (!closed) open(); }, backoffDelay(attempt++));
    });
  }

  open();
  return { close() { closed = true; es.close(); } };
}
