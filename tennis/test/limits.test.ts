import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlarmGate, checkLimits, ROLL_LIMIT_DEG } from '../src/core/limits.ts';
import { axisAngle, IDENTITY } from '../src/core/quat.ts';

const deg = (d: number) => (d * Math.PI) / 180;

test('neutral pose is ok', () => {
  const s = checkLimits(IDENTITY);
  assert.equal(s.level, 'ok');
  assert.equal(s.axis, null);
});

test('roll within limit warns near the edge, alarms beyond', () => {
  assert.equal(checkLimits(axisAngle([0, 1, 0], deg(ROLL_LIMIT_DEG * 0.9))).level, 'warn');
  const s = checkLimits(axisAngle([0, 1, 0], deg(85)));
  assert.equal(s.level, 'alarm');
});

test('pitch limits differ up and down', () => {
  assert.equal(checkLimits(axisAngle([1, 0, 0], deg(60))).level, 'ok');
  assert.equal(checkLimits(axisAngle([1, 0, 0], deg(100))).level, 'alarm');
  assert.equal(checkLimits(axisAngle([1, 0, 0], deg(-100))).level, 'alarm');
});

test('total rotation beyond limit alarms', () => {
  const s = checkLimits(axisAngle([0, 0, 1], deg(170)));
  assert.equal(s.level, 'alarm');
  assert.equal(s.axis, 'total');
});

test('alarm gate repeats at most every interval', () => {
  const g = new AlarmGate();
  const a = checkLimits(axisAngle([0, 1, 0], deg(88)));
  assert.equal(g.fire(a, 0), true);
  assert.equal(g.fire(a, 100), false);
  assert.equal(g.fire(a, 700), true);
  assert.equal(g.fire(checkLimits(IDENTITY), 5000), false);
});
