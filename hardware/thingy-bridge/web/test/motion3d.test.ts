import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  linearAccel, MotionEstimator, relativeTo, rotate, slerp, sampleFromSnapshot, sampleFromFrame,
  type MotionSample, type Quat, type Vec3,
} from '../src/motion3d.ts';

const S = Math.SQRT1_2;
const close = (a: readonly number[], b: readonly number[], eps = 1e-9): void =>
  a.forEach((v, i) => assert.ok(Math.abs(v - (b[i] ?? NaN)) < eps, `[${a.join(', ')}] ≉ [${b.join(', ')}]`));

const ROLL90: Quat = [S, S, 0, 0]; // 90° about the device x axis
const YAW90: Quat = [S, 0, 0, S]; // 90° about the vertical axis

// Device lying flat and still: accelerometer reads +1 g up, gyro ≈ 0.
const still = (t: number, accel: Vec3 = [0, 0, 1]): MotionSample => ({ t, q: [1, 0, 0, 0], accel, gyro: [0.3, -0.2, 0.1] });

function run(est: MotionEstimator, samples: MotionSample[]): Vec3[] {
  return samples.map((s) => est.update(s).pos);
}

test('gravity is removed for known orientations (world frame, in g)', () => {
  close(linearAccel([1, 0, 0, 0], [0, 0, 1]), [0, 0, 0]);
  // rolled 90°: gravity shows up on the device y axis
  close(linearAccel(ROLL90, [0, 1, 0]), [0, 0, 0], 1e-12);
  // rolled 90° plus 0.3 g along the device x axis (still world x)
  close(linearAccel(ROLL90, [0.3, 1, 0]), [0.3, 0, 0], 1e-12);
  // yawed 90°: device x points to world y
  close(linearAccel(YAW90, [0.5, 0, 1]), [0, 0.5, 0], 1e-12);
  // free fall: −1 g in the world frame
  close(linearAccel([1, 0, 0, 0], [0, 0, 0]), [0, 0, -1]);
});

test('rotate, relativeTo and slerp agree with the Thingy quaternion convention [w,x,y,z]', () => {
  close(rotate(YAW90, [1, 0, 0]), [0, 1, 0], 1e-12);
  close(relativeTo(YAW90, YAW90), [1, 0, 0, 0], 1e-12);
  const half = slerp([1, 0, 0, 0], YAW90, 0.5);
  close(half, [Math.cos(Math.PI / 8), 0, 0, Math.sin(Math.PI / 8)], 1e-12);
  // takes the short way even if the sign of the target flips
  close(slerp([1, 0, 0, 0], [-S, 0, 0, -S], 0.5), half, 1e-12);
});

test('a still device stays centred', () => {
  const est = new MotionEstimator();
  const samples = Array.from({ length: 300 }, (_, i) => still(i * 100, [0.01 * Math.sin(i), -0.01 * Math.cos(i), 1.005]));
  for (const p of run(est, samples)) assert.ok(Math.hypot(...p) < 0.002, `pos ${p.join(', ')}`);
  assert.equal(est.state().still, true);
});

test('an impulse to the left moves left, then glides back to the centre', () => {
  const est = new MotionEstimator();
  const samples: MotionSample[] = [];
  let t = 0;
  for (let i = 0; i < 10; i++) samples.push(still((t += 100)));
  // 10 Hz like /api/stream: two samples of −0.5 g along x (a push to the left)
  for (let i = 0; i < 2; i++) samples.push({ t: (t += 100), q: [1, 0, 0, 0], accel: [-0.5, 0, 1], gyro: [2, 1, 30] });
  for (let i = 0; i < 50; i++) samples.push(still((t += 100)));
  const xs = run(est, samples).map((p) => p[0]);
  const minX = Math.min(...xs);
  assert.ok(minX < -0.03, `min x ${minX}`);
  assert.ok(Math.max(...xs) < 0.01, 'no big overshoot to the right');
  const last = est.state().pos;
  assert.ok(Math.hypot(...last) < 0.002, `back at centre: ${last.join(', ')}`);
});

test('the push direction follows the orientation (yawed device, push along device x = world y)', () => {
  const est = new MotionEstimator();
  let t = 0;
  for (let i = 0; i < 5; i++) est.update({ ...still((t += 100)), q: YAW90 });
  for (let i = 0; i < 2; i++) est.update({ t: (t += 100), q: YAW90, accel: [0.5, 0, 1], gyro: [0, 0, 40] });
  const p = est.update({ ...still((t += 100)), q: YAW90 }).pos;
  assert.ok(p[1] > 0.02 && Math.abs(p[0]) < 0.005, `pos ${p.join(', ')}`);
});

test('a constant accelerometer bias does not drift away', () => {
  for (const gyro of [[0, 0, 0], [20, -15, 10]] as Vec3[]) {
    const est = new MotionEstimator();
    let maxDist = 0;
    for (let i = 0; i < 1200; i++) {
      const { pos } = est.update({ t: i * 50, q: [1, 0, 0, 0], accel: [0.06, -0.04, 1.03], gyro });
      maxDist = Math.max(maxDist, Math.hypot(...pos));
    }
    assert.ok(maxDist < 0.08, `bounded: ${maxDist}`);
    assert.ok(Math.hypot(...est.state().pos) < 0.005, `decays: ${est.state().pos.join(', ')}`);
  }
});

test('gaps in the data and reset do not produce jumps', () => {
  const est = new MotionEstimator();
  est.update(still(0));
  const p = est.update({ t: 5000, q: [1, 0, 0, 0], accel: [-2, 0, 1], gyro: [0, 0, 0] }).pos;
  assert.deepEqual(p, [0, 0, 0]);
  est.reset();
  assert.deepEqual(est.state().pos, [0, 0, 0]);
});

test('samples are read from SSE snapshots and /api/motion frames', () => {
  const motion = { quaternion: { w: 1, x: 0, y: 0, z: 0 }, accel_g: { x: 0.1, y: 0, z: 1 }, gyro_dps: { x: 1, y: 2, z: 3 } };
  assert.deepEqual(sampleFromSnapshot({ ts: 5, motion }), { t: 5, q: [1, 0, 0, 0], accel: [0.1, 0, 1], gyro: [1, 2, 3] });
  assert.equal(sampleFromSnapshot({ ts: 5, motion: { ...motion, quaternion: null } }), null);
  // without raw accel the orientation is still usable (no translation)
  assert.deepEqual(sampleFromSnapshot({ ts: 5, motion: { ...motion, accel_g: null } })?.accel, null);
  assert.deepEqual(sampleFromFrame('{"t":7,"q":[1,0,0,0],"gyro":[1,2,3],"accel":[0,0,1],"button":false}'),
    { t: 7, q: [1, 0, 0, 0], accel: [0, 0, 1], gyro: [1, 2, 3] });
  assert.equal(sampleFromFrame('nope'), null);
  assert.equal(sampleFromFrame('{"t":7,"q":[1,0,0]}'), null);
});
