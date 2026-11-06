import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dbfsToPercent, updatePeak, micView } from '../static/js/level.js';

test('dbfsToPercent maps -80..0 dBFS linearly to 0..100 and clamps', () => {
  assert.equal(dbfsToPercent(0), 100);
  assert.equal(dbfsToPercent(-40), 50);
  assert.equal(dbfsToPercent(-100), 0);
  assert.equal(dbfsToPercent(5), 100);
  assert.equal(dbfsToPercent(null), 0);
});

test('updatePeak jumps up immediately', () => {
  assert.deepEqual(updatePeak({ value: -50, at: 0 }, -20, 100), { value: -20, at: 100 });
});

test('updatePeak holds for 1.5 s, then decays at 20 dB/s but not below the current level', () => {
  const peak = { value: -20, at: 0 };
  assert.deepEqual(updatePeak(peak, -60, 1000), peak);
  assert.equal(updatePeak(peak, -60, 2000).value, -30);
  assert.equal(updatePeak(peak, -25, 2000).value, -25);
});

test('updatePeak ignores missing levels', () => {
  const peak = { value: -20, at: 0 };
  assert.deepEqual(updatePeak(peak, null, 100), peak);
  assert.deepEqual(updatePeak(null, null, 100), null);
});

test('micView shows the level only while the microphone is on', () => {
  assert.deepEqual(micView({ mic_enabled: true, level_dbfs: -38.5 }), { enabled: true, level: -38.5, hint: '' });
  assert.deepEqual(micView({ mic_enabled: false, level_dbfs: -38.5 }), { enabled: false, level: null, hint: 'Mikrofon aus' });
  assert.deepEqual(micView({ mic_enabled: true, level_dbfs: null }), { enabled: true, level: null, hint: 'warte auf Daten' });
});

test('micView treats a missing mic_enabled as on when a level arrives', () => {
  assert.equal(micView({ level_dbfs: -20 }).enabled, true);
  assert.equal(micView({ level_dbfs: null }).enabled, false);
  assert.equal(micView(undefined).enabled, false);
});
