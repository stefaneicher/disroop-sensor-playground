// POST helpers for the bridge API (docs/protocol.md §2).
async function postJson(path, body, fetchFn = globalThis.fetch) {
  const res = await fetchFn(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
}

export const postSong = (action, volume, fetchFn) => postJson('/api/song', { action, volume }, fetchFn);
export const postLed = (rgb, fetchFn) => postJson('/api/led', rgb, fetchFn);
export const postMic = (enabled, fetchFn) => postJson('/api/mic', { enabled }, fetchFn);
