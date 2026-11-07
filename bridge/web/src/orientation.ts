import { isNum } from './format.ts';
import type { Motion } from './telemetry.ts';

export interface Quaternion { w: number; x: number; y: number; z: number }
export interface Euler { roll: number; pitch: number; yaw: number }

const RAD = Math.PI / 180;

// Aerospace convention: roll about x, pitch about y, yaw about z (ZYX order).
export function eulerToQuaternion({ roll, pitch, yaw }: Euler): Quaternion {
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

const clean = (v: number): number => {
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
};

// Device frame (x right, y forward/up, z out of the top) -> CSS frame (x right, y down, z to viewer):
// M = S·R·S with S = diag(1, -1, 1). matrix3d is column-major.
export function quaternionToMatrix3d(q: Quaternion): string {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  const [w, x, y, z] = [q.w / n, q.x / n, q.y / n, q.z / n];
  const r = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
  const s = [1, -1, 1];
  const m = (i: number, j: number): number => clean(s[i]! * r[i]![j]! * s[j]!);
  const cols = [0, 1, 2].flatMap((j) => [m(0, j), m(1, j), m(2, j), 0]);
  return `matrix3d(${[...cols, 0, 0, 0, 1].join(',')})`;
}

export function orientationTransform(motion: Partial<Pick<Motion, 'euler_deg' | 'quaternion'>> | null | undefined): string | null {
  const e = motion?.euler_deg;
  if (e && isNum(e.roll) && isNum(e.pitch) && isNum(e.yaw)) {
    return quaternionToMatrix3d(eulerToQuaternion({ roll: e.roll, pitch: e.pitch, yaw: e.yaw }));
  }
  const q = motion?.quaternion;
  if (q && isNum(q.w) && isNum(q.x) && isNum(q.y) && isNum(q.z)) return quaternionToMatrix3d({ w: q.w, x: q.x, y: q.y, z: q.z });
  return null;
}

const DEG = 180 / Math.PI;

// Inverse of eulerToQuaternion (ZYX); pitch is clamped at ±90° (gimbal lock).
export function quaternionToEuler(q: Quaternion): Euler {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  const [w, x, y, z] = [q.w / n, q.x / n, q.y / n, q.z / n];
  const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * DEG;
  const pitch = Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x)))) * DEG;
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * DEG;
  return { roll: clean(roll), pitch: clean(pitch), yaw: clean(yaw) };
}

export interface Attitude { roll: number; pitch: number }

// Roll/pitch for the artificial horizon: euler preferred, else derived from the quaternion.
export function attitudeOf(motion: Partial<Pick<Motion, 'euler_deg' | 'quaternion'>> | null | undefined): Attitude | null {
  const e = motion?.euler_deg;
  if (e && isNum(e.roll) && isNum(e.pitch)) return { roll: e.roll, pitch: e.pitch };
  const q = motion?.quaternion;
  if (q && isNum(q.w) && isNum(q.x) && isNum(q.y) && isNum(q.z)) {
    const { roll, pitch } = quaternionToEuler({ w: q.w, x: q.x, y: q.y, z: q.z });
    return { roll, pitch };
  }
  return null;
}

// SVG transform for the horizon (sky/ground) layer: banks opposite to roll, moves down when the nose pitches up.
export function horizonTransform({ roll, pitch }: Attitude, unitsPerDeg: number): string {
  const p = Math.max(-90, Math.min(90, pitch));
  return `rotate(${clean(-roll)}) translate(0 ${clean(p * unitsPerDeg)})`;
}
