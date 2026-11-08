import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrame } from '../src/input/motion.ts';
import { Calibration, steer } from '../src/input/calibration.ts';
import { SwingDetector, speedKmh } from '../src/input/swing.ts';
import { axisAngle, mul, type Quat, type Vec3 } from '../src/input/quat.ts';

test('parseFrame accepts the /api/motion JSON and rejects garbage', () => {
  const f = parseFrame('{"t":1000,"q":[1,0,0,0],"gyro":[1,2,3],"accel":[0,0,1],"button":true,"tap":{"dir":"x+","count":2}}');
  assert.deepEqual(f, { t: 1000, q: [1, 0, 0, 0], gyro: [1, 2, 3], accel: [0, 0, 1], button: true, tap: { dir: 'x+', count: 2 } });
  assert.equal(parseFrame('{"t":1,"q":[1,0,0],"gyro":[0,0,0],"accel":[0,0,0],"button":false}'), null);
  assert.equal(parseFrame('nope'), null);
});

test('calibration makes the neutral pose the origin for roll and orientation', () => {
  const c = new Calibration();
  assert.equal(c.done, false);
  const neutral = mul(axisAngle([0, 0, 1], 1.2), axisAngle([0, 1, 0], (10 * Math.PI) / 180));
  c.set(neutral);
  assert.equal(c.done, true);
  assert.ok(Math.abs(c.roll(neutral)) < 1e-6);
  const tilted = mul(axisAngle([0, 0, 1], 1.2), axisAngle([0, 1, 0], (30 * Math.PI) / 180));
  assert.ok(Math.abs(c.roll(tilted) - 20) < 1e-6);
  const r = c.relative(neutral);
  assert.ok(Math.abs(r[0] - 1) < 1e-9);
});

test('steer has a deadzone, is linear after it and saturates', () => {
  assert.equal(steer(5), 0);
  assert.equal(steer(-7.9), 0);
  assert.ok(Math.abs(steer(19) - 0.5) < 1e-9);
  assert.equal(steer(45), 1);
  assert.equal(steer(-45), -1);
});

test('speedKmh maps swing speed to shot power', () => {
  assert.equal(speedKmh(350), 60);
  assert.equal(speedKmh(1200), 160);
  assert.equal(speedKmh(5000), 180);
});

/** Feeds a swing about world Z (positive = forehand) with a bell-shaped rate profile. */
function swing(d: SwingDetector, t0: number, peak: number, q: Quat = [1, 0, 0, 0], ms = 300) {
  const out = [];
  for (let t = 0; t <= ms; t += 10) {
    const rate = peak * Math.sin((Math.PI * t) / ms);
    const e = d.feed(t0 + t, [0, 0, rate] as Vec3, q);
    if (e) out.push(e);
  }
  for (let t = ms + 10; t < ms + 200; t += 10) {
    const e = d.feed(t0 + t, [0, 0, 0], q);
    if (e) out.push(e);
  }
  return out;
}

test('swing detector: one event per swing with peak time, speed and side', () => {
  const d = new SwingDetector();
  const ev = swing(d, 0, 800);
  assert.equal(ev.length, 1);
  const e = ev[0]!;
  assert.equal(e.side, 'forehand');
  assert.equal(e.kind, 'forehand');
  assert.ok(Math.abs(e.t - 150) <= 10, `peak at ${e.t}`);
  assert.ok(e.peakDps > 780);
  assert.ok(e.speedKmh > 110 && e.speedKmh < 120);
  const back = swing(d, 1000, -900);
  assert.equal(back.length, 1);
  assert.equal(back[0]!.side, 'backhand');
});

test('swing detector ignores slow movements and uses hysteresis against jitter', () => {
  const d = new SwingDetector();
  assert.equal(swing(d, 0, 300).length, 0);
  // jitter around the threshold after a swing must not create a second event
  const ev = [];
  for (let t = 0; t < 400; t += 10) {
    const e = d.feed(2000 + t, [0, 0, t < 100 ? 600 : 340 + (t % 20 === 0 ? 30 : -30)], [1, 0, 0, 0]);
    if (e) ev.push(e);
  }
  for (let t = 400; t < 600; t += 10) {
    const e = d.feed(2000 + t, [0, 0, 0], [1, 0, 0, 0]);
    if (e) ev.push(e);
  }
  assert.equal(ev.length, 1);
});

test('an open racket face (roll) turns a swing into a slice', () => {
  const d = new SwingDetector();
  const open = axisAngle([0, 1, 0], (40 * Math.PI) / 180);
  const ev = swing(d, 0, 700, open);
  assert.equal(ev[0]!.kind, 'slice');
  assert.equal(ev[0]!.side, 'forehand');
});

test('swing side follows the world vertical axis, not the device axis', () => {
  const d = new SwingDetector();
  // device upside down: device +Z rate is a clockwise (backhand) turn in the world
  const flipped = axisAngle([0, 1, 0], Math.PI);
  const ev = swing(d, 0, 800, flipped);
  assert.equal(ev[0]!.side, 'backhand');
});
