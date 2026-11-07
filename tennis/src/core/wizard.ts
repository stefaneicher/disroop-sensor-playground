/** Guided calibration (4 steps) and drift detection. Pure state machines, driven by motion frames. */
import { STEER_FULL } from './calibration.ts';
import { axisAngle, mul, normalize, rotate, type Quat, type Vec3 } from './quat.ts';
import type { Side } from './swing.ts';

export type WizardStep = 'pose' | 'still' | 'swing' | 'tilt' | 'done';
export const WIZARD_STEPS: WizardStep[] = ['pose', 'still', 'swing', 'tilt'];

export const STILL_DPS = 25; // gyro magnitude below this counts as "still"
export const STILL_MS = 1500; // hold still this long to capture the neutral pose
export const POSE_MS = 1000; // logo up this long in step 1 -> next step
export const LOGO_UP_G = 0.85; // accel z (device up axis) above this: logo points up
export const TILT_DEG = STEER_FULL * 0.6; // tilt reached in step 4
export const DONE_DELAY_MS = 1200; // show the green check before moving on

export interface WizardInput {
  t: number; // ms
  gyro: Vec3; // °/s
  accel: Vec3; // g, device frame (Z = logo up)
  button?: 'short' | 'long' | null;
  swing?: { side: Side; speedKmh: number } | null;
  /** Tilt relative to the captured neutral pose, degrees (steps 3 and 4). */
  roll?: number;
}

export interface WizardOutput {
  /** Capture the neutral pose now (on the frame just fed). */
  capture: boolean;
  step: WizardStep;
}

export class CalibrationWizard {
  step: WizardStep = 'pose';
  /** 0..1 of the current hold (step 1 pose / step 2 still). */
  progress = 0;
  lastSwing: { side: Side; speedKmh: number } | null = null;
  swingOk = false;
  seenLeft = false;
  seenRight = false;
  roll = 0;
  private holdSince = -1;
  private okAt = -1;

  get index(): number {
    return Math.max(0, WIZARD_STEPS.indexOf(this.step));
  }

  /** Step complete, the check mark is showing. */
  get ok(): boolean {
    return this.okAt >= 0;
  }

  private go(step: WizardStep): void {
    this.step = step;
    this.progress = 0;
    this.holdSince = -1;
    this.okAt = -1;
  }

  /** Skips the current step (UI "Weiter"); skipping the still step captures immediately. */
  next(): WizardOutput {
    const capture = this.step === 'still';
    const i = WIZARD_STEPS.indexOf(this.step);
    this.go(i < 0 || i + 1 >= WIZARD_STEPS.length ? 'done' : WIZARD_STEPS[i + 1]!);
    return { capture, step: this.step };
  }

  back(): void {
    const i = WIZARD_STEPS.indexOf(this.step);
    if (i > 0) this.go(WIZARD_STEPS[i - 1]!);
  }

  restart(): void {
    this.go('pose');
    this.lastSwing = null;
    this.swingOk = false;
    this.seenLeft = this.seenRight = false;
  }

  feed(f: WizardInput): WizardOutput {
    const still = Math.hypot(f.gyro[0], f.gyro[1], f.gyro[2]) < STILL_DPS;
    if (f.roll !== undefined) this.roll = f.roll;
    if (this.okAt >= 0) {
      if (f.t - this.okAt >= DONE_DELAY_MS) return this.next();
      return { capture: false, step: this.step };
    }
    if (f.button === 'short') return this.next();
    switch (this.step) {
      case 'pose': {
        const up = f.accel[2] > LOGO_UP_G && still;
        this.hold(up, f.t, POSE_MS);
        if (this.progress >= 1) this.okAt = f.t;
        break;
      }
      case 'still': {
        this.hold(still, f.t, STILL_MS);
        if (this.progress >= 1) {
          this.okAt = f.t;
          return { capture: true, step: this.step };
        }
        break;
      }
      case 'swing':
        if (f.swing) {
          this.lastSwing = f.swing;
          if (f.swing.side === 'forehand') {
            this.swingOk = true;
            this.okAt = f.t;
          }
        }
        break;
      case 'tilt':
        if (this.roll <= -TILT_DEG) this.seenLeft = true;
        if (this.roll >= TILT_DEG) this.seenRight = true;
        if (this.seenLeft && this.seenRight) this.okAt = f.t;
        break;
      case 'done':
        break;
    }
    return { capture: false, step: this.step };
  }

  private hold(cond: boolean, t: number, ms: number): void {
    if (!cond) {
      this.holdSince = -1;
      this.progress = 0;
      return;
    }
    if (this.holdSince < 0) this.holdSince = t;
    this.progress = Math.min(1, (t - this.holdSince) / ms);
  }
}

/** Heading of the device forward axis (Y) around the world up axis (Z), radians. */
export function heading(q: Quat): number {
  const f = rotate(normalize(q), [0, 1, 0]);
  return Math.atan2(-f[0], f[1]);
}

/** Orientation with the heading removed: pitch and roll stay, forward points "into the screen". */
export function levelled(q: Quat): Quat {
  return normalize(mul(axisAngle([0, 0, 1], -heading(q)), q));
}

export const DRIFT_STILL_MS = 3000;
export const DRIFT_HEADING_DEG = 35;
export const DRIFT_ROLL_DEG = 14;

/**
 * Flags a probably stale calibration: the Thingy rests (gyro quiet) for DRIFT_STILL_MS while its heading has
 * wandered away from the neutral pose (fusion drift without magnetometer) or it keeps a steady sideways tilt.
 */
export class DriftMonitor {
  needsRecalibration = false;
  reason: 'heading' | 'roll' | null = null;
  private heading0 = 0;
  private stillSince = -1;

  reset(q0: Quat): void {
    this.heading0 = heading(q0);
    this.needsRecalibration = false;
    this.reason = null;
    this.stillSince = -1;
  }

  /** `roll`: tilt relative to the neutral pose (degrees). */
  feed(t: number, q: Quat, gyro: Vec3, roll: number): boolean {
    if (Math.hypot(gyro[0], gyro[1], gyro[2]) >= STILL_DPS) {
      this.stillSince = -1;
      return this.needsRecalibration;
    }
    if (this.stillSince < 0) this.stillSince = t;
    if (t - this.stillSince < DRIFT_STILL_MS) return this.needsRecalibration;
    let d = ((heading(q) - this.heading0) * 180) / Math.PI;
    d = ((((d + 180) % 360) + 360) % 360) - 180;
    if (Math.abs(d) > DRIFT_HEADING_DEG) this.reason = 'heading';
    else if (Math.abs(roll) > DRIFT_ROLL_DEG) this.reason = 'roll';
    else this.reason = null;
    this.needsRecalibration = this.reason !== null;
    return this.needsRecalibration;
  }
}
