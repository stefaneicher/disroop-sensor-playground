import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlarmGate, checkSkiLimits } from '../src/ski/limits.ts';
import { axisAngle, IDENTITY } from '../src/core/quat.ts';

const deg = (d: number) => (d * Math.PI) / 180;

test('ski limits: neutral ok, near edge warn, beyond alarm', () => {
  assert.equal(checkSkiLimits(IDENTITY).level, 'ok');
  assert.equal(checkSkiLimits(axisAngle([0, 1, 0], deg(68))).level, 'warn');
  const s = checkSkiLimits(axisAngle([0, 1, 0], deg(85)));
  assert.equal(s.level, 'alarm');
  assert.equal(s.axis, 'roll');
});

test('ski limits: pitch down tolerates more than up', () => {
  assert.equal(checkSkiLimits(axisAngle([1, 0, 0], deg(-60))).level, 'ok');
  assert.equal(checkSkiLimits(axisAngle([1, 0, 0], deg(100))).level, 'alarm');
});

test('alarm gate repeats at interval only on alarm', () => {
  const g = new AlarmGate();
  assert.equal(g.fire('warn', 0), false);
  assert.equal(g.fire('alarm', 1000), true);
  assert.equal(g.fire('alarm', 1300), false);
  assert.equal(g.fire('alarm', 1800), true);
});
