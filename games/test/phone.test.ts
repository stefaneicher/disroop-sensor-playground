import assert from 'node:assert/strict';
import { test } from 'node:test';
import { phoneFrame, playerQuat, toPlayer, type PhoneSample } from '../src/input/phone.ts';
import { pitchDeg, rollDeg, rotate } from '../src/input/quat.ts';

const near = (a: number, b: number, eps = 0.5): void => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('flat on the table: no roll, no pitch, in every screen orientation', () => {
  for (const angle of [0, 90, 180, 270]) {
    const q = playerQuat({ alpha: 37, beta: 0, gamma: 0 }, angle);
    near(rollDeg(q), 0);
    near(pitchDeg(q), 0);
  }
});

test('portrait: top edge up (beta > 0) is nose up, right edge down (gamma > 0) is roll right', () => {
  near(pitchDeg(playerQuat({ alpha: 0, beta: 30, gamma: 0 }, 0)), 30);
  near(rollDeg(playerQuat({ alpha: 0, beta: 0, gamma: 30 }, 0)), 30);
});

test('landscape (top of the phone to the left, angle 90): screen-right edge down is roll right', () => {
  // Phone frame: screen-right is the phone's -Y edge (its bottom). Lowering the bottom edge = beta > 0.
  near(rollDeg(playerQuat({ alpha: 0, beta: 25, gamma: 0 }, 90)), 25);
  // Screen-forward (away from the player) is the phone's +X edge. Raising it = gamma < 0.
  near(pitchDeg(playerQuat({ alpha: 0, beta: 0, gamma: -20 }, 90)), 20);
});

test('landscape (top to the right, angle 270): mirror of angle 90', () => {
  near(rollDeg(playerQuat({ alpha: 0, beta: -25, gamma: 0 }, 270)), 25);
  near(pitchDeg(playerQuat({ alpha: 0, beta: 0, gamma: 20 }, 270)), 20);
});

test('player X axis maps to the screen-right edge of the phone', () => {
  const q = playerQuat({ alpha: 0, beta: 0, gamma: 0 }, 90);
  const x = rotate(q, [1, 0, 0]);
  near(x[0], 0, 1e-6);
  near(x[1], -1, 1e-6); // phone -Y in earth frame (alpha 0: phone Y = north)
});

test('toPlayer turns phone vectors with the screen', () => {
  assert.deepEqual(toPlayer([1, 2, 3], 0), [1, 2, 3]);
  const v = toPlayer([0, -1, 0], 90); // phone bottom edge = screen right in landscape 90
  near(v[0], 1, 1e-9);
  near(v[1], 0, 1e-9);
});

test('phoneFrame: gravity becomes +1 g on Z, missing sensors are tolerated, button passes through', () => {
  const s: PhoneSample = {
    t: 1234.6,
    orientation: { alpha: null, beta: null, gamma: null },
    rotationRate: null,
    accel: { x: 0, y: 0, z: 9.80665 },
    screenAngle: 0,
    button: true,
  };
  const f = phoneFrame(s);
  assert.equal(f.t, 1235);
  assert.deepEqual(f.q, [1, 0, 0, 0]);
  assert.deepEqual(f.gyro, [0, 0, 0]);
  assert.deepEqual(f.accel, [0, 0, 1]);
  assert.equal(f.button, true);
});

test('phoneFrame: rotation rate around the phone X axis is roll rate in landscape 90', () => {
  const f = phoneFrame({
    t: 0,
    orientation: { alpha: 0, beta: 0, gamma: 0 },
    rotationRate: { alpha: 0, beta: 200, gamma: 0 },
    accel: null,
    screenAngle: 90,
    button: false,
  });
  // phone X = screen forward in landscape 90 → rotation around player Y (forward axis)
  near(f.gyro[0], 0, 1e-6);
  near(f.gyro[1], 200, 1e-6);
});
