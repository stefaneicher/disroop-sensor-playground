import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSim } from '../dev/sim.js';

const example = JSON.parse(readFileSync(new URL('../../../shared/telemetry.example.json', import.meta.url), 'utf8'));
const chorus = JSON.parse(readFileSync(new URL('../../../shared/chorus.json', import.meta.url), 'utf8'));

function shape(v) {
  if (v === null || typeof v !== 'object') return typeof v === 'number' ? 'number' : typeof v;
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])]));
}

test('sim snapshots have exactly the shape of telemetry.example.json', () => {
  const sim = createSim({ chorus, startTs: 1_000_000 });
  assert.deepEqual(shape(sim.snapshot(1_000_000)), shape(example));
  assert.equal(sim.snapshot(1_000_000).device.source, 'sim');
});

test('sim values stay within physical ranges', () => {
  const sim = createSim({ chorus, startTs: 0 });
  for (let t = 0; t < 120_000; t += 777) {
    const s = sim.snapshot(t);
    assert.ok(s.motion.heading_deg >= 0 && s.motion.heading_deg < 360);
    assert.ok(s.environment.eco2_ppm >= 400);
    assert.ok(s.sound.level_dbfs <= 0 && s.sound.level_dbfs >= -100);
    assert.ok(s.device.battery_pct >= 0 && s.device.battery_pct <= 100);
  }
});

test('song play walks through the chorus notes and stop resets', () => {
  const sim = createSim({ chorus, startTs: 0 });
  sim.song('play', 80, 0);
  assert.deepEqual(sim.snapshot(0).sound.song, { playing: true, note_index: 0 });
  const second = chorus.notes[0].on_ms + chorus.notes[0].off_ms;
  assert.equal(sim.snapshot(second + 1).sound.song.note_index, 1);
  sim.song('stop', 80, second + 2);
  assert.deepEqual(sim.snapshot(second + 3).sound.song, { playing: false, note_index: -1 });
});

test('led sets the reported LED colour', () => {
  const sim = createSim({ chorus, startTs: 0 });
  sim.led({ r: 1, g: 2, b: 3 });
  assert.deepEqual(sim.snapshot(0).ui.led, { r: 1, g: 2, b: 3 });
});
