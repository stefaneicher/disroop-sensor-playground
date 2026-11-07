/** One frame of the fast motion channel (GET /api/motion, docs/protocol.md). */
import type { Quat, Vec3 } from './quat.ts';

export interface MotionFrame {
  t: number; // Unix ms (bridge clock)
  q: Quat; // w, x, y, z
  gyro: Vec3; // °/s
  accel: Vec3; // g
  button: boolean;
  tap?: { dir: string; count: number };
}

const nums = (v: unknown, n: number): boolean =>
  Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));

export function parseFrame(text: string): MotionFrame | null {
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof o !== 'object' || o === null) return null;
  const r = o as Record<string, unknown>;
  if (typeof r.t !== 'number' || !nums(r.q, 4) || !nums(r.gyro, 3) || !nums(r.accel, 3)) return null;
  const f: MotionFrame = { t: r.t, q: r.q as Quat, gyro: r.gyro as Vec3, accel: r.accel as Vec3, button: r.button === true };
  const tap = r.tap as Record<string, unknown> | undefined;
  if (tap && typeof tap.dir === 'string' && typeof tap.count === 'number') f.tap = { dir: tap.dir, count: tap.count };
  return f;
}
