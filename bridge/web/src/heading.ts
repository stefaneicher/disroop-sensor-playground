// Compass math: angle wrap, circular smoothing, tilt compensation, field quality and the compass card scale.
import { isNum } from './format.ts';
import type { Num } from './telemetry.ts';

type Vec = { x: number; y: number; z: number };
type MaybeXyz = { x: Num; y: Num; z: Num } | null | undefined;

const RAD = Math.PI / 180;
export const CARDINALS_DE = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'] as const;
export const FIELD_OK_UT = { min: 25, max: 65 } as const;

export const normDeg = (deg: number): number => {
  const r = ((deg % 360) + 360) % 360;
  return r === 360 || Object.is(r, -0) ? 0 : r;
};

// Signed shortest rotation from b to a, in (−180, 180].
export function angleDiff(a: number, b: number): number {
  const d = normDeg(a - b);
  return d > 180 ? d - 360 : d;
}

// Continuous angle for animations: never jumps by more than 180° (359 → 1 continues to 361).
export const unwrap = (previous: number, deg: number): number => previous + angleDiff(deg, previous);

// Mean direction of angles; null if empty or the directions cancel out.
export function circularMean(angles: readonly number[]): number | null {
  if (!angles.length) return null;
  let s = 0; let c = 0;
  for (const a of angles) { s += Math.sin(a * RAD); c += Math.cos(a * RAD); }
  if (Math.hypot(s, c) / angles.length < 1e-6) return null;
  return normDeg(Math.atan2(s, c) / RAD);
}

// Circular moving average over the last `size` headings.
export class HeadingFilter {
  #window: number[] = [];
  readonly size: number;
  constructor(size = 5) { this.size = size; }
  push(deg: number): number | null {
    this.#window.push(normDeg(deg));
    if (this.#window.length > this.size) this.#window.shift();
    return this.value;
  }
  get value(): number | null { return circularMean(this.#window); }
  reset(): void { this.#window = []; }
}

const toVec = (v: MaybeXyz): Vec | null => (v && isNum(v.x) && isNum(v.y) && isNum(v.z) ? { x: v.x, y: v.y, z: v.z } : null);
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec, b: Vec): Vec => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const norm = (a: Vec): number => Math.hypot(a.x, a.y, a.z);

export function fieldMagnitude(v: MaybeXyz): number | null {
  const m = toVec(v);
  return m ? norm(m) : null;
}

// Tilt-compensated heading of the device's +y axis (device frame: x right, y forward, z up).
// The accelerometer at rest measures "up"; the field projected onto the horizontal plane points north.
export function tiltCompensatedHeading(mag: MaybeXyz, accel: MaybeXyz): number | null {
  const m = toVec(mag);
  const a = toVec(accel);
  if (!m || !a || norm(a) < 1e-6) return null;
  const up = scale(a, 1 / norm(a));
  const north = sub(m, scale(up, dot(m, up)));
  const forward = sub({ x: 0, y: 1, z: 0 }, scale(up, up.y));
  if (norm(north) < 1e-6 || norm(forward) < 1e-6) return null;
  const east = cross(north, up);
  return normDeg(Math.atan2(dot(forward, east) / norm(east), dot(forward, north) / norm(north)) / RAD);
}

export interface FieldQuality { level: 'none' | 'good' | 'bad'; label: string; hint: string }

export function fieldQuality(magnitude: number | null): FieldQuality {
  if (magnitude === null) return { level: 'none', label: '–', hint: '' };
  if (magnitude >= FIELD_OK_UT.min && magnitude <= FIELD_OK_UT.max) return { level: 'good', label: 'Feld plausibel', hint: '' };
  return {
    level: 'bad',
    label: magnitude < FIELD_OK_UT.min ? 'Feld zu schwach' : 'Feld gestört',
    hint: 'Kompass kalibrieren: Thingy in 8er-Bewegung drehen',
  };
}

export interface ScaleTick { deg: number; size: 'major' | 'mid' | 'minor'; label?: string; cardinal?: boolean }

// Compass card: ticks every 5°, longer every 10°, numbers every 30° in tens of degrees (aviation style: 3 = 30°),
// German cardinals every 45°.
export function compassScale(): ScaleTick[] {
  const ticks: ScaleTick[] = [];
  for (let deg = 0; deg < 360; deg += 5) {
    const tick: ScaleTick = { deg, size: deg % 30 === 0 || deg % 45 === 0 ? 'major' : deg % 10 === 0 ? 'mid' : 'minor' };
    if (deg % 45 === 0) { tick.label = CARDINALS_DE[deg / 45]!; tick.cardinal = true; }
    else if (deg % 30 === 0) tick.label = String(deg / 10);
    ticks.push(tick);
  }
  return ticks;
}

export interface TrailPoint { deg: number; age: number }

// Recent headings (sampled at most every minGapMs) for the trail on the compass card.
export class HeadingTrail {
  #points: { t: number; deg: number }[] = [];
  readonly windowMs: number;
  readonly minGapMs: number;
  constructor(windowMs = 15_000, minGapMs = 300) { this.windowMs = windowMs; this.minGapMs = minGapMs; }
  push(t: number, deg: number): void {
    const last = this.#points[this.#points.length - 1];
    if (last && t - last.t < this.minGapMs) return;
    this.#points.push({ t, deg: normDeg(deg) });
    while (this.#points.length && this.#points[0]!.t < t - this.windowMs) this.#points.shift();
  }
  // age 0 = newest, 1 = about to expire.
  points(now: number): TrailPoint[] {
    return this.#points
      .filter((p) => now - p.t <= this.windowMs)
      .map((p) => ({ deg: p.deg, age: Math.min(1, Math.max(0, (now - p.t) / this.windowMs)) }));
  }
}

export const fmtHeading = (deg: number | null): string => (deg === null ? '–' : `${Math.round(normDeg(deg)) % 360}°`);

export interface HeadingReading { deg: number; source: 'thingy' | 'tilt' }
type MotionLike = { heading_deg?: Num; compass_ut?: MaybeXyz; accel_g?: MaybeXyz } | null | undefined;

// Thingy's own heading when present, else tilt-compensated from magnetometer + accelerometer.
export function headingFrom(m: MotionLike): HeadingReading | null {
  if (isNum(m?.heading_deg)) return { deg: normDeg(m.heading_deg), source: 'thingy' };
  const tilt = tiltCompensatedHeading(m?.compass_ut, m?.accel_g);
  return tilt === null ? null : { deg: tilt, source: 'tilt' };
}
