import { test } from 'node:test';
import assert from 'node:assert/strict';
import { axisAngle, conj, mul, rotate, rollDeg, toThree } from '../src/input/quat.ts';

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('rotate turns X into Y for +90° about Z', () => {
  const v = rotate(axisAngle([0, 0, 1], Math.PI / 2), [1, 0, 0]);
  near(v[0], 0); near(v[1], 1); near(v[2], 0);
});

test('q * conj(q) is identity', () => {
  const q = mul(axisAngle([0, 0, 1], 0.7), axisAngle([0, 1, 0], -0.3));
  const r = mul(q, conj(q));
  near(r[0], 1); near(r[1], 0); near(r[2], 0); near(r[3], 0);
});

test('rollDeg reads the tilt about the forward axis independent of heading', () => {
  for (const yaw of [0, 1, -2.5]) {
    const q = mul(axisAngle([0, 0, 1], yaw), axisAngle([0, 1, 0], (25 * Math.PI) / 180));
    near(rollDeg(q), 25, 1e-6);
  }
  near(rollDeg(axisAngle([0, 1, 0], (-40 * Math.PI) / 180)), -40, 1e-6);
});

test('toThree maps device axes (X right, Y forward, Z up) to three.js (X right, Y up, -Z forward)', () => {
  const yawLeft = toThree(axisAngle([0, 0, 1], Math.PI / 2)); // device: turn left about up
  const v = rotate(yawLeft, [0, 0, -1]); // three: forward
  near(v[0], -1); near(v[1], 0); near(v[2], 0);
});
