import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MotionController } from '../src/core/controller.ts';
import { axisAngle } from '../src/core/quat.ts';
import type { MotionFrame } from '../src/core/motion.ts';

const frame = (t: number, extra: Partial<MotionFrame> = {}): MotionFrame => ({ t, q: [1, 0, 0, 0], gyro: [0, 0, 0], accel: [0, 0, 1], button: false, ...extra });

test('button: short press on release, long press once while held', () => {
  const c = new MotionController();
  assert.equal(c.feed(frame(0, { button: true })).button, null);
  assert.equal(c.feed(frame(300)).button, 'short');
  c.feed(frame(1000, { button: true }));
  assert.equal(c.feed(frame(1500, { button: true })).button, null);
  assert.equal(c.feed(frame(1900, { button: true })).button, 'long');
  assert.equal(c.feed(frame(2500, { button: true })).button, null);
  assert.equal(c.feed(frame(2600)).button, null);
});

test('swings are reported with their age relative to the newest frame', () => {
  const c = new MotionController();
  const out = [];
  for (let t = 0; t <= 500; t += 10) {
    const rate = t <= 300 ? 900 * Math.sin((Math.PI * t) / 300) : 0;
    out.push(...c.feed(frame(t, { gyro: [0, 0, rate] })).swings);
  }
  assert.equal(out.length, 1);
  assert.equal(out[0]!.side, 'forehand');
  assert.ok(out[0]!.ageMs > 100 && out[0]!.ageMs < 250, `age ${out[0]!.ageMs}`);
});

test('steering follows calibrated tilt and pauses during a swing', () => {
  const c = new MotionController();
  const tilt = axisAngle([0, 1, 0], (25 * Math.PI) / 180);
  c.feed(frame(0, { q: tilt }));
  assert.ok(c.steer() > 0.6);
  c.calibrate();
  assert.equal(c.steer(), 0);
  c.feed(frame(10, { q: tilt, gyro: [0, 0, 800] }));
  assert.equal(c.steer(), 0);
});

test('racket orientation is relative to the calibrated pose in three.js axes', () => {
  const c = new MotionController();
  assert.equal(c.racket(), null);
  const q = axisAngle([0, 0, 1], 0.5);
  c.feed(frame(0, { q }));
  c.calibrate();
  const r = c.racket()!;
  assert.ok(Math.abs(r[0] - 1) < 1e-9);
});
