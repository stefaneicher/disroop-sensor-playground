import { isNum } from './format.js';

const RAD = Math.PI / 180;

// Aerospace convention: roll about x, pitch about y, yaw about z (ZYX order).
export function eulerToQuaternion({ roll, pitch, yaw }) {
  const [cr, sr] = [Math.cos((roll * RAD) / 2), Math.sin((roll * RAD) / 2)];
  const [cp, sp] = [Math.cos((pitch * RAD) / 2), Math.sin((pitch * RAD) / 2)];
  const [cy, sy] = [Math.cos((yaw * RAD) / 2), Math.sin((yaw * RAD) / 2)];
  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}

const clean = (v) => {
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
};

// Device frame (x right, y forward/up, z out of the top) -> CSS frame (x right, y down, z to viewer):
// M = S·R·S with S = diag(1, -1, 1). matrix3d is column-major.
export function quaternionToMatrix3d(q) {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  const [w, x, y, z] = [q.w / n, q.x / n, q.y / n, q.z / n];
  const r = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
  const s = [1, -1, 1];
  const m = (i, j) => clean(s[i] * r[i][j] * s[j]);
  const cols = [0, 1, 2].flatMap((j) => [m(0, j), m(1, j), m(2, j), 0]);
  return `matrix3d(${[...cols, 0, 0, 0, 1].join(',')})`;
}

export function orientationTransform(motion) {
  const e = motion?.euler_deg;
  if (e && [e.roll, e.pitch, e.yaw].every(isNum)) return quaternionToMatrix3d(eulerToQuaternion(e));
  const q = motion?.quaternion;
  if (q && [q.w, q.x, q.y, q.z].every(isNum)) return quaternionToMatrix3d(q);
  return null;
}
