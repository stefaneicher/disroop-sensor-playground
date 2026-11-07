/** Quaternions as [w, x, y, z] (Thingy order). Pure math, no three.js. */
export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];

export const IDENTITY: Quat = [1, 0, 0, 0];

export function mul(a: Quat, b: Quat): Quat {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

export function conj(q: Quat): Quat {
  return [q[0], -q[1], -q[2], -q[3]];
}

export function normalize(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  return n > 0 ? [q[0] / n, q[1] / n, q[2] / n, q[3] / n] : [...IDENTITY];
}

export function axisAngle(axis: Vec3, rad: number): Quat {
  const n = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const s = Math.sin(rad / 2) / n;
  return [Math.cos(rad / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}

export function rotate(q: Quat, v: Vec3): Vec3 {
  const r = mul(mul(q, [0, v[0], v[1], v[2]]), conj(q));
  return [r[1], r[2], r[3]];
}

/** Tilt of the device X axis against the horizon in degrees (positive: right edge down). */
export function rollDeg(q: Quat): number {
  const x = rotate(normalize(q), [1, 0, 0]);
  return (Math.asin(Math.max(-1, Math.min(1, -x[2]))) * 180) / Math.PI;
}

/** Device frame (X right, Y forward, Z up) to three.js frame (X right, Y up, Z back). */
export function toThree(q: Quat): Quat {
  return [q[0], q[1], q[3], -q[2]];
}
