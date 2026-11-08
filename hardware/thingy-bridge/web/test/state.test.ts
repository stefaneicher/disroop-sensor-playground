import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialState, reduce, parseJson, connectionView, STALE_MS, LOG_LIMIT } from '../src/state.ts';
import type { Action } from '../src/state.ts';

const example = JSON.parse(readFileSync(new URL('../../../shared/telemetry.example.json', import.meta.url), 'utf8'));

test('starts connecting without a snapshot', () => {
  const s = initialState();
  assert.equal(s.snapshot, null);
  assert.equal(connectionView(s, 0).status, 'connecting');
});

test('telemetry stores the snapshot and makes the view live', () => {
  let s = reduce(initialState(), { type: 'open', now: 0 });
  s = reduce(s, { type: 'telemetry', snapshot: example, now: 100 });
  assert.equal(s.snapshot, example);
  assert.deepEqual(connectionView(s, 200), { status: 'live', label: 'Live', stale: false, source: 'sim', deviceConnected: true });
});

test('telemetry marks a new tap only when its timestamp changes', () => {
  let s = reduce(initialState(), { type: 'telemetry', snapshot: example, now: 0 });
  assert.equal(s.newTap, true);
  s = reduce(s, { type: 'telemetry', snapshot: example, now: 100 });
  assert.equal(s.newTap, false);
  const tapped = { ...example, motion: { ...example.motion, tap: { direction: 'X+', count: 2, ts: 5 } } };
  s = reduce(s, { type: 'telemetry', snapshot: tapped, now: 200 });
  assert.equal(s.newTap, true);
});

test('data becomes stale after STALE_MS without telemetry', () => {
  const s = reduce(initialState(), { type: 'telemetry', snapshot: example, now: 0 });
  assert.equal(connectionView(s, STALE_MS - 1).stale, false);
  assert.equal(connectionView(s, STALE_MS + 1).stale, true);
  assert.equal(connectionView(s, STALE_MS + 1).status, 'stale');
});

test('error switches to reconnecting and counts attempts; open resets them', () => {
  let s = reduce(initialState(), { type: 'error', now: 0 });
  s = reduce(s, { type: 'error', now: 1 });
  assert.equal(s.attempts, 2);
  assert.equal(connectionView(s, 1).status, 'reconnecting');
  s = reduce(s, { type: 'open', now: 2 });
  assert.equal(s.attempts, 0);
});

test('a snapshot with connected=false reports the device as disconnected', () => {
  const s = reduce(initialState(), { type: 'telemetry', snapshot: { ...example, connected: false }, now: 0 });
  const v = connectionView(s, 1);
  assert.equal(v.status, 'device-offline');
  assert.equal(v.deviceConnected, false);
});

test('log entries are prepended and capped', () => {
  let s = initialState();
  for (let i = 0; i < LOG_LIMIT + 5; i++) s = reduce(s, { type: 'log', msg: `m${i}`, now: i });
  assert.equal(s.log.length, LOG_LIMIT);
  assert.deepEqual(s.log[0], { msg: `m${LOG_LIMIT + 4}`, at: LOG_LIMIT + 4 });
});

test('reduce returns the same state for unknown actions', () => {
  const s = initialState();
  assert.equal(reduce(s, { type: 'nope' } as unknown as Action), s);
});

test('parseJson returns null for malformed input', () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
  assert.equal(parseJson('{oops'), null);
});
