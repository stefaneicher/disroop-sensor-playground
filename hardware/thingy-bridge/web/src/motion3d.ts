// Pure motion math for the 3D room view ("Thingy im Raum"); no DOM, no three.js.
//
// Orientation comes straight from the sensor-fusion quaternion and is exact. Position cannot be measured by an IMU:
// integrating acceleration twice drifts by metres within seconds. MotionEstimator therefore only produces a short-term,
// plausible displacement: gravity removed with the quaternion, high-passed, leaky-integrated, zero-velocity updates
// while the device is still, and a spring back to the centre. A push to the left moves left and glides back.
import { isNum } from './format.ts';
import type { Motion } from './telemetry.ts';

/** Quaternion [w, x, y, z] (Thingy order), rotates device frame → world frame (z up). */
export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];

export interface MotionSample {
  /** Unix ms. */
  t: number;
  q: Quat;
  /** Accelerometer in g, device frame; null if not reported. */
  accel: Vec3 | null;
  /** Gyroscope in °/s, device frame; null if not reported. */
  gyro: Vec3 | null;
}

export interface MotionState {
  /** Estimated displacement in m, world frame (short-term only, returns to 0). */
  pos: Vec3;
  /** Linear acceleration in g, world frame, gravity and slow bias removed. */
  lin: Vec3;
  still: boolean;
}

const G = 9.80665;
const ZERO: Vec3 = [0, 0, 0];

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

export const conj = (q: Quat): Quat => [q[0], -q[1], -q[2], -q[3]];

export function normalize(q: Quat): Quat {
  const n = Math.hypot(...q);
  return n > 0 ? [q[0] / n, q[1] / n, q[2] / n, q[3] / n] : [1, 0, 0, 0];
}

export function rotate(q: Quat, v: Vec3): Vec3 {
  const r = mul(mul(q, [0, v[0], v[1], v[2]]), conj(q));
  return [r[1], r[2], r[3]];
}

/** Orientation q expressed relative to the reference orientation ref ("Nullstellung"). */
export const relativeTo = (ref: Quat, q: Quat): Quat => normalize(mul(conj(normalize(ref)), normalize(q)));

/** Spherical interpolation along the shorter arc. */
export function slerp(a: Quat, b: Quat, t: number): Quat {
  let [bw, bx, by, bz] = b;
  let dot = a[0] * bw + a[1] * bx + a[2] * by + a[3] * bz;
  if (dot < 0) { [bw, bx, by, bz, dot] = [-bw, -bx, -by, -bz, -dot]; }
  if (dot > 0.9995) return normalize([a[0] + t * (bw - a[0]), a[1] + t * (bx - a[1]), a[2] + t * (by - a[2]), a[3] + t * (bz - a[3])]);
  const th = Math.acos(dot);
  const s = Math.sin(th);
  const [ka, kb] = [Math.sin((1 - t) * th) / s, Math.sin(t * th) / s];
  return [ka * a[0] + kb * bw, ka * a[1] + kb * bx, ka * a[2] + kb * by, ka * a[3] + kb * bz];
}

/** Accelerometer reading (g, device frame) → linear acceleration (g, world frame) without gravity. */
export function linearAccel(q: Quat, accel: Vec3): Vec3 {
  const w = rotate(normalize(q), accel);
  return [w[0], w[1], w[2] - 1];
}

export interface EstimatorOptions {
  /** Velocity leak time constant, s. */
  velocityTau: number;
  /** Spring back to the centre (position leak) time constant, s. */
  returnTau: number;
  /** High-pass (slow bias) time constant while moving / while still, s. */
  biasTau: number;
  biasTauStill: number;
  /** Linear accelerations below this (g) count as noise. */
  deadbandG: number;
  /** Still: ||a| − 1 g| below this (g) and |gyro| below stillGyroDps for at least stillSeconds. */
  stillG: number;
  stillGyroDps: number;
  stillSeconds: number;
  /** Displacement limit, m. */
  maxRange: number;
  /** Gaps longer than this (s) restart the integration. */
  maxGap: number;
}

export const ESTIMATOR_DEFAULTS: EstimatorOptions = {
  velocityTau: 0.5, returnTau: 0.7, biasTau: 1.5, biasTauStill: 0.3, deadbandG: 0.03,
  stillG: 0.06, stillGyroDps: 6, stillSeconds: 0.15, maxRange: 0.25, maxGap: 0.5,
};

const MAX_STEP = 0.01;
const len = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k];

export class MotionEstimator {
  private readonly o: EstimatorOptions;
  private last: number | null = null;
  private bias: Vec3 | null = null;
  private vel: Vec3 = ZERO;
  private pos: Vec3 = ZERO;
  private lin: Vec3 = ZERO;
  private stillFor = 0;

  constructor(options: Partial<EstimatorOptions> = {}) {
    this.o = { ...ESTIMATOR_DEFAULTS, ...options };
  }

  reset(): void {
    this.last = null;
    this.bias = null;
    this.vel = this.pos = this.lin = ZERO;
    this.stillFor = 0;
  }

  state(): MotionState {
    return { pos: this.pos, lin: this.lin, still: this.stillFor >= this.o.stillSeconds };
  }

  update(s: MotionSample): MotionState {
    const o = this.o;
    const dt = this.last === null ? Infinity : (s.t - this.last) / 1000;
    if (dt <= 0) return this.state();
    this.last = s.t;
    const raw = s.accel ? linearAccel(s.q, s.accel) : null;
    if (!raw || dt > o.maxGap) {
      // Start or restart: assume rest, take the current reading as bias, keep decaying the shown displacement.
      this.bias = raw;
      this.vel = this.lin = ZERO;
      this.stillFor = 0;
      if (Number.isFinite(dt)) this.pos = scale(this.pos, Math.exp(-Math.min(dt, 5) / o.returnTau));
      return this.state();
    }

    const gyro = s.gyro ? len(s.gyro) : 0;
    const quiet = Math.abs(len(s.accel!) - 1) < o.stillG && gyro < o.stillGyroDps;
    this.stillFor = quiet ? this.stillFor + dt : 0;
    const still = this.stillFor >= o.stillSeconds;

    const bias = this.bias ?? raw;
    this.bias = add(bias, add(raw, bias, -1), 1 - Math.exp(-dt / (quiet ? o.biasTauStill : o.biasTau)));
    const hp = add(raw, this.bias, -1);
    this.lin = hp;
    const mag = len(hp);
    const a = quiet || mag < o.deadbandG ? ZERO : scale(hp, ((mag - o.deadbandG) / mag) * G);

    if (still) this.vel = ZERO; // zero-velocity update
    for (let left = dt; left > 1e-9; left -= MAX_STEP) {
      const h = Math.min(MAX_STEP, left);
      this.vel = scale(add(this.vel, a, h), Math.exp(-h / o.velocityTau));
      this.pos = scale(add(this.pos, this.vel, h), Math.exp(-h / o.returnTau));
    }
    const d = len(this.pos);
    if (d > o.maxRange) this.pos = scale(this.pos, o.maxRange / d);
    return this.state();
  }
}

const vec = (v: { x?: unknown; y?: unknown; z?: unknown } | null | undefined): Vec3 | null =>
  v && isNum(v.x) && isNum(v.y) && isNum(v.z) ? [v.x, v.y, v.z] : null;

/** Sample from an SSE /api/stream snapshot; null without a quaternion. */
export function sampleFromSnapshot(s: { ts?: number; motion?: Partial<Motion> | null }): MotionSample | null {
  const q = s.motion?.quaternion;
  if (!q || !isNum(q.w) || !isNum(q.x) || !isNum(q.y) || !isNum(q.z) || !isNum(s.ts)) return null;
  return { t: s.ts, q: [q.w, q.x, q.y, q.z], accel: vec(s.motion?.accel_g), gyro: vec(s.motion?.gyro_dps) };
}

const arr = (v: unknown, n: number): number[] | null =>
  Array.isArray(v) && v.length === n && v.every(isNum) ? (v as number[]) : null;

/** Sample from a /api/motion WebSocket frame (JSON text, see docs/protocol.md); null if malformed. */
export function sampleFromFrame(text: string): MotionSample | null {
  let f: { t?: unknown; q?: unknown; accel?: unknown; gyro?: unknown };
  try { f = JSON.parse(text); } catch { return null; }
  const q = arr(f?.q, 4);
  if (!q || !isNum(f.t)) return null;
  return { t: f.t, q: q as Quat, accel: arr(f.accel, 3) as Vec3 | null, gyro: arr(f.gyro, 3) as Vec3 | null };
}
