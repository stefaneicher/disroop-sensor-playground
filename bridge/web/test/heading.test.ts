import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normDeg, angleDiff, unwrap, circularMean, HeadingFilter, fieldMagnitude, tiltCompensatedHeading,
  fieldQuality, compassScale, HeadingTrail, fmtHeading, headingFrom,
} from '../src/heading.ts';

const near = (a: number | null, b: number, eps = 1e-6): boolean => a !== null && Math.abs(angleDiff(a, b)) < eps;

test('normDeg and angleDiff wrap around 0/360', () => {
  assert.equal(normDeg(-10), 350);
  assert.equal(normDeg(720), 0);
  assert.equal(angleDiff(1, 359), 2);
  assert.equal(angleDiff(359, 1), -2);
  assert.equal(angleDiff(180, 0), 180);
});

test('unwrap continues across 359 → 0 without spinning back', () => {
  assert.equal(unwrap(359, 1), 361);
  assert.equal(unwrap(721, 359), 719);
});

test('circularMean handles the wrap', () => {
  assert.ok(near(circularMean([359, 1]), 0));
  assert.ok(near(circularMean([350, 10, 0]), 0));
  assert.ok(near(circularMean([80, 100]), 90));
  assert.equal(circularMean([]), null);
  assert.equal(circularMean([0, 180]), null);
});

test('HeadingFilter averages the last N headings', () => {
  const f = new HeadingFilter(2);
  f.push(10);
  assert.ok(near(f.push(350), 0));
  assert.ok(near(f.push(330), 340));
});

test('fieldMagnitude', () => {
  assert.equal(fieldMagnitude({ x: 30, y: 0, z: 40 }), 50);
  assert.equal(fieldMagnitude({ x: null, y: 0, z: 0 }), null);
  assert.equal(fieldMagnitude(null), null);
});

test('tilt-compensated heading of a flat device', () => {
  const up = { x: 0, y: 0, z: 1 };
  // Field: horizontal part points north, vertical part points down (northern hemisphere).
  assert.ok(near(tiltCompensatedHeading({ x: 0, y: 20, z: -40 }, up), 0));
  assert.ok(near(tiltCompensatedHeading({ x: -20, y: 0, z: -40 }, up), 90)); // north on the left → facing east
  assert.ok(near(tiltCompensatedHeading({ x: 20, y: 0, z: -40 }, up), 270));
  assert.ok(near(tiltCompensatedHeading({ x: 0, y: -20, z: -40 }, up), 180));
});

test('tilt-compensated heading is independent of roll', () => {
  const roll = 30 * Math.PI / 180;
  // Device facing east, rolled 30° about its y axis: rotate world vectors into the device frame.
  const toDevice = ({ x, y, z }: { x: number; y: number; z: number }) => ({
    x: x * Math.cos(roll) - z * Math.sin(roll), y, z: x * Math.sin(roll) + z * Math.cos(roll),
  });
  const mag = toDevice({ x: -20, y: 0, z: -40 });
  const acc = toDevice({ x: 0, y: 0, z: 1 });
  assert.ok(near(tiltCompensatedHeading(mag, acc), 90, 1e-6));
  assert.equal(tiltCompensatedHeading(mag, null), null);
});

test('fieldQuality flags magnitudes outside 25–65 µT', () => {
  assert.equal(fieldQuality(50).level, 'good');
  assert.equal(fieldQuality(12).level, 'bad');
  assert.match(fieldQuality(90).hint, /8er-Bewegung/);
  assert.equal(fieldQuality(null).level, 'none');
});

test('compassScale: ticks every 5°, aviation numbers every 30°, German cardinals', () => {
  const s = compassScale();
  assert.equal(s.length, 72);
  assert.deepEqual(s.filter((t) => t.cardinal).map((t) => t.label), ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']);
  assert.deepEqual(s.filter((t) => t.label && !t.cardinal).map((t) => t.label),
    ['3', '6', '12', '15', '21', '24', '30', '33']);
  assert.equal(s.find((t) => t.deg === 10)?.size, 'mid');
  assert.equal(s.find((t) => t.deg === 15)?.size, 'minor');
});

test('HeadingTrail samples sparsely and expires old points', () => {
  const trail = new HeadingTrail(1000, 300);
  trail.push(0, 10); trail.push(100, 20); trail.push(400, 30); trail.push(1200, 370);
  const pts = trail.points(1200);
  assert.deepEqual(pts.map((p) => p.deg), [30, 10]);
  assert.deepEqual(pts.map((p) => p.age), [0.8, 0]);
});

test('fmtHeading rounds 359.6 to 0°', () => {
  assert.equal(fmtHeading(359.6), '0°');
  assert.equal(fmtHeading(42.4), '42°');
  assert.equal(fmtHeading(null), '–');
});

test('headingFrom prefers the Thingy heading and falls back to tilt compensation', () => {
  assert.deepEqual(headingFrom({ heading_deg: 370 }), { deg: 10, source: 'thingy' });
  const fb = headingFrom({ heading_deg: null, compass_ut: { x: -20, y: 0, z: -40 }, accel_g: { x: 0, y: 0, z: 1 } });
  assert.equal(fb?.source, 'tilt');
  assert.ok(near(fb!.deg, 90));
  assert.equal(headingFrom({ heading_deg: null, compass_ut: null }), null);
  assert.equal(headingFrom(undefined), null);
});
