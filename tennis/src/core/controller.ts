/** Turns /api/motion frames into game input: swings, tilt steering, button presses, racket pose. */
import { Calibration, steer } from './calibration.ts';
import type { MotionFrame } from './motion.ts';
import { toThree, type Quat } from './quat.ts';
import { SwingDetector, type SwingEvent } from './swing.ts';

export const LONG_PRESS_MS = 800;

export interface ControllerOutput {
  swings: (SwingEvent & { ageMs: number })[];
  button: 'short' | 'long' | null;
}

export class MotionController {
  readonly calibration = new Calibration();
  private readonly detector = new SwingDetector();
  latest: MotionFrame | null = null;
  private downT = -1;
  private longSent = false;

  feed(f: MotionFrame): ControllerOutput {
    this.latest = f;
    const out: ControllerOutput = { swings: [], button: null };
    const e = this.detector.feed(f.t, f.gyro, f.q, this.calibration.roll0);
    if (e) out.swings.push({ ...e, ageMs: f.t - e.t });
    if (f.button && this.downT < 0) {
      this.downT = f.t;
      this.longSent = false;
    } else if (f.button && !this.longSent && f.t - this.downT >= LONG_PRESS_MS) {
      this.longSent = true;
      out.button = 'long';
    } else if (!f.button && this.downT >= 0) {
      if (!this.longSent) out.button = 'short';
      this.downT = -1;
    }
    return out;
  }

  /** Calibrates on the latest frame; false without data. */
  calibrate(): boolean {
    if (!this.latest) return false;
    this.calibration.set(this.latest.q);
    return true;
  }

  /** Tilt steering -1..1 (0 while swinging or without data). */
  steer(): number {
    if (!this.latest || this.detector.active) return 0;
    return steer(this.calibration.roll(this.latest.q));
  }

  /** Current tilt relative to the neutral pose in degrees. */
  roll(): number {
    return this.latest ? this.calibration.roll(this.latest.q) : 0;
  }

  /** Racket rotation relative to the neutral pose, three.js axes; null without data. */
  racket(): Quat | null {
    if (!this.latest) return null;
    return toThree(this.calibration.relative(this.latest.q));
  }
}
