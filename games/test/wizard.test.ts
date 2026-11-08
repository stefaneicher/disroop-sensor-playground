import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MotionController } from '../src/input/controller.ts';
import { axisAngle, mul, rotate } from '../src/input/quat.ts';
import { CalibrationWizard, DriftMonitor, POSE_MS, STILL_MS, TILT_DEG, DONE_DELAY_MS, heading, levelled } from '../src/input/wizard.ts';
import type { WizardInput } from '../src/input/wizard.ts';

const quiet = (t: number, extra: Partial<WizardInput> = {}): WizardInput => ({ t, gyro: [0, 0, 0], accel: [0, 0, 1], ...extra });

/** Feeds frames every 10 ms from t0 to t1; returns the times at which capture was requested. */
function run(w: CalibrationWizard, t0: number, t1: number, extra: Partial<WizardInput> = {}): number[] {
  const caps: number[] = [];
  for (let t = t0; t <= t1; t += 10) if (w.feed(quiet(t, extra)).capture) caps.push(t);
  return caps;
}

test('wizard: logo up and still advances step 1, holding still captures once in step 2', () => {
  const w = new CalibrationWizard();
  run(w, 0, 500, { accel: [0, 0.7, 0.7] }); // tilted: logo not up
  assert.equal(w.step, 'pose');
  assert.equal(w.progress, 0);
  run(w, 510, 510 + POSE_MS + DONE_DELAY_MS);
  assert.equal(w.step, 'still');
  const caps = run(w, 3000, 3000 + STILL_MS + 50);
  assert.equal(caps.length, 1);
  assert.ok(w.ok, 'check mark while waiting');
  run(w, 4600, 4600 + DONE_DELAY_MS);
  assert.equal(w.step, 'swing');
});

test('wizard: movement resets the still countdown; button press captures immediately', () => {
  const w = new CalibrationWizard();
  w.next();
  run(w, 0, 1000);
  assert.ok(w.progress > 0.6);
  w.feed(quiet(1010, { gyro: [0, 80, 0] }));
  assert.equal(w.progress, 0);
  const out = w.feed(quiet(1020, { button: 'short' }));
  assert.deepEqual(out, { capture: true, step: 'swing' });
});

test('wizard: backhand gives feedback but only a forehand completes the swing step', () => {
  const w = new CalibrationWizard();
  w.next();
  w.next();
  w.feed(quiet(0, { swing: { side: 'backhand', speedKmh: 90 } }));
  assert.equal(w.step, 'swing');
  assert.equal(w.swingOk, false);
  assert.equal(w.lastSwing?.side, 'backhand');
  w.feed(quiet(100, { swing: { side: 'forehand', speedKmh: 120 } }));
  assert.ok(w.swingOk && w.ok);
  w.feed(quiet(100 + DONE_DELAY_MS));
  assert.equal(w.step, 'tilt');
});

test('wizard: tilt step needs both directions, then done', () => {
  const w = new CalibrationWizard();
  for (let i = 0; i < 3; i++) w.next();
  w.feed(quiet(0, { roll: TILT_DEG + 1 }));
  assert.ok(w.seenRight && !w.seenLeft && !w.ok);
  w.feed(quiet(10, { roll: -TILT_DEG - 1 }));
  assert.ok(w.ok);
  w.feed(quiet(10 + DONE_DELAY_MS));
  assert.equal(w.step, 'done');
  w.back();
  assert.equal(w.step, 'done', 'back from done is a no-op');
  w.restart();
  assert.equal(w.step, 'pose');
});

test('levelled() removes the heading but keeps the tilt', () => {
  const tilt = axisAngle([0, 1, 0], 0.4); // roll about the forward axis
  const q = mul(axisAngle([0, 0, 1], 1.2), tilt);
  assert.ok(Math.abs(heading(q) - 1.2) < 1e-9);
  const l = levelled(q);
  assert.ok(Math.abs(heading(l)) < 1e-9);
  const up = rotate(l, [0, 0, 1]);
  const up0 = rotate(tilt, [0, 0, 1]);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(up[i]! - up0[i]!) < 1e-9);
});

test('drift monitor: flags heading drift only after resting, clears on reset', () => {
  const d = new DriftMonitor();
  d.reset([1, 0, 0, 0]);
  const drifted = axisAngle([0, 0, 1], (50 * Math.PI) / 180);
  assert.equal(d.feed(0, drifted, [0, 0, 0], 0), false);
  assert.equal(d.feed(2000, drifted, [0, 0, 0], 0), false);
  d.feed(2500, drifted, [0, 200, 0], 0); // moving: restart the rest timer
  assert.equal(d.feed(5000, drifted, [0, 0, 0], 0), false);
  assert.equal(d.feed(8600, drifted, [0, 0, 0], 0), true);
  assert.equal(d.reason, 'heading');
  d.reset(drifted);
  assert.equal(d.needsRecalibration, false);
  d.feed(0, drifted, [0, 0, 0], 20);
  assert.equal(d.feed(3100, drifted, [0, 0, 0], 20), true);
  assert.equal(d.reason, 'roll');
});

test('controller: calibrate() resets the drift monitor and preview() is levelled before calibration', () => {
  const c = new MotionController();
  const q = mul(axisAngle([0, 0, 1], 0.8), axisAngle([1, 0, 0], 0.3));
  c.feed({ t: 0, q, gyro: [0, 0, 0], accel: [0, 0, 1], button: false });
  const p = c.preview()!;
  assert.ok(Math.abs(p[0] - Math.cos(0.15)) < 1e-9, 'only the pitch remains');
  c.calibrate();
  assert.deepEqual(c.preview()!.map((v) => Math.round(v * 1e9) / 1e9 + 0), [1, 0, 0, 0]);
  assert.equal(c.drift.needsRecalibration, false);
});
