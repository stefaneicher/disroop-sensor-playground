import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eulerToQuaternion, quaternionToMatrix3d, orientationTransform } from '../src/orientation.ts';

const close = (a: number | undefined, b: number): boolean => a !== undefined && Math.abs(a - b) < 1e-9;

test('identity quaternion yields the identity matrix3d', () => {
  assert.equal(quaternionToMatrix3d({ w: 1, x: 0, y: 0, z: 0 }), 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)');
});

test('yaw of 90° rotates device x towards screen up (CSS -y)', () => {
  const q = eulerToQuaternion({ roll: 0, pitch: 0, yaw: 90 });
  const m = (quaternionToMatrix3d(q).match(/[-\d.e]+/g) ?? []).slice(1).map(Number);
  // first column = image of x-axis in CSS coordinates
  assert.ok(close(m[0], 0) && close(m[1], -1) && close(m[2], 0), m.join());
});

test('quaternion is normalised before use', () => {
  assert.equal(quaternionToMatrix3d({ w: 2, x: 0, y: 0, z: 0 }), 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)');
});

test('orientationTransform prefers euler, falls back to quaternion, else null', () => {
  const fromEuler = orientationTransform({ euler_deg: { roll: 0, pitch: 0, yaw: 90 }, quaternion: { w: 1, x: 0, y: 0, z: 0 } });
  assert.notEqual(fromEuler, quaternionToMatrix3d({ w: 1, x: 0, y: 0, z: 0 }));
  assert.equal(orientationTransform({ euler_deg: null, quaternion: { w: 1, x: 0, y: 0, z: 0 } }),
    quaternionToMatrix3d({ w: 1, x: 0, y: 0, z: 0 }));
  assert.equal(orientationTransform({ euler_deg: { roll: null, pitch: 0, yaw: 0 }, quaternion: null }), null);
  assert.equal(orientationTransform(null), null);
});
