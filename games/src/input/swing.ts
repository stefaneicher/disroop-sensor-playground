/** Swing detection from the gyroscope: threshold with hysteresis, peak = hit moment. */
import { normalize, rollDeg, rotate, type Quat, type Vec3 } from './quat.ts';

export type Side = 'forehand' | 'backhand';
export type Stroke = Side | 'slice';

export interface SwingEvent {
  t: number; // time of the peak (same clock as feed)
  peakDps: number;
  speedKmh: number;
  side: Side;
  kind: Stroke;
  rollDeg: number; // tilt at the peak, relative to roll0
}

export interface SwingOptions {
  enterDps: number;
  exitDps: number;
  sliceDeg: number;
  maxMs: number; // a swing longer than this is reported anyway
  refractoryMs: number;
}

export const SWING_DEFAULTS: SwingOptions = { enterDps: 350, exitDps: 200, sliceDeg: 28, maxMs: 600, refractoryMs: 150 };

/** 350 °/s -> 60 km/h ... 1200 °/s -> 160 km/h, clamped to 40..180. */
export function speedKmh(peakDps: number): number {
  const v = 60 + ((peakDps - 350) * 100) / 850;
  return Math.round(Math.max(40, Math.min(180, v)));
}

export class SwingDetector {
  private readonly o: SwingOptions;
  private start = -1;
  private peak = 0;
  private peakT = 0;
  private peakVert = 0;
  private peakRoll = 0;
  private quietUntil = -Infinity;

  constructor(opts: Partial<SwingOptions> = {}) {
    this.o = { ...SWING_DEFAULTS, ...opts };
  }

  get active(): boolean {
    return this.start >= 0;
  }

  /** Feeds one frame (t in ms, gyro in °/s device frame, absolute quaternion). roll0: calibrated neutral roll. */
  feed(t: number, gyro: Vec3, q: Quat, roll0 = 0): SwingEvent | null {
    const mag = Math.hypot(gyro[0], gyro[1], gyro[2]);
    if (this.start < 0) {
      if (mag < this.o.enterDps || t < this.quietUntil) return null;
      this.start = t;
      this.peak = 0;
    }
    if (mag > this.peak) {
      const qn = normalize(q);
      this.peak = mag;
      this.peakT = t;
      this.peakVert = rotate(qn, gyro)[2];
      this.peakRoll = rollDeg(qn) - roll0;
    }
    if (mag >= this.o.exitDps && t - this.start < this.o.maxMs) return null;
    this.start = -1;
    this.quietUntil = t + this.o.refractoryMs;
    const side: Side = this.peakVert >= 0 ? 'forehand' : 'backhand';
    return {
      t: this.peakT,
      peakDps: this.peak,
      speedKmh: speedKmh(this.peak),
      side,
      kind: Math.abs(this.peakRoll) >= this.o.sliceDeg ? 'slice' : side,
      rollDeg: this.peakRoll,
    };
  }
}
