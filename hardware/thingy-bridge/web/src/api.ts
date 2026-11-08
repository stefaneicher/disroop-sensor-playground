import type { Rgb } from './color.ts';

type Fetch = typeof globalThis.fetch;

// POST helpers for the bridge API (docs/protocol.md §2).
async function postJson(path: string, body: unknown, fetchFn: Fetch = globalThis.fetch): Promise<void> {
  const res = await fetchFn(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
}

export const postSong = (action: 'play' | 'stop', volume: number, fetchFn?: Fetch): Promise<void> =>
  postJson('/api/song', { action, volume }, fetchFn);
export const postLed = (rgb: Rgb, fetchFn?: Fetch): Promise<void> => postJson('/api/led', rgb, fetchFn);
export const postMic = (enabled: boolean, fetchFn?: Fetch): Promise<void> => postJson('/api/mic', { enabled }, fetchFn);
