import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusBadge } from '../src/badge.ts';

import type { ConnectionView } from '../src/state.ts';

const view = (over: Partial<ConnectionView> = {}): ConnectionView => ({ label: '', status: 'live', stale: false, source: 'ble', deviceConnected: true, ...over });

test('real Thingy data over BLE is green LIVE', () => {
  assert.deepEqual(statusBadge(view()), { kind: 'live', text: 'LIVE – Thingy', simBanner: false });
});

test('simulator data is clearly marked as not real', () => {
  assert.deepEqual(statusBadge(view({ source: 'sim' })), { kind: 'sim', text: 'SIMULATOR – keine echten Daten', simBanner: true });
});

test('connecting or reconnecting with recent data is orange "Verbindet…"', () => {
  for (const status of ['connecting', 'reconnecting'] as const) {
    assert.deepEqual(statusBadge(view({ status, source: null })), { kind: 'connecting', text: 'Verbindet…', simBanner: false });
  }
});

test('bridge reachable but Thingy not connected is orange', () => {
  assert.deepEqual(statusBadge(view({ status: 'device-offline', deviceConnected: false })),
    { kind: 'connecting', text: 'Thingy nicht verbunden', simBanner: false });
});

test('stale data (stream lost > 3 s) is red "Keine Daten", also in sim mode', () => {
  assert.deepEqual(statusBadge(view({ status: 'stale', stale: true })), { kind: 'nodata', text: 'Keine Daten', simBanner: false });
  assert.deepEqual(statusBadge(view({ status: 'reconnecting', stale: true, source: 'sim' })),
    { kind: 'nodata', text: 'Keine Daten', simBanner: true });
});
