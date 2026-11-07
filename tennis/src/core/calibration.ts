/** Neutral pose (set by a button press) and tilt steering. */
import { IDENTITY, conj, mul, normalize, rollDeg, type Quat } from './quat.ts';

export class Calibration {
  private q0: Quat = [...IDENTITY];
  /** Absolute roll of the neutral pose in degrees. */
  roll0 = 0;
  done = false;

  set(q: Quat): void {
    this.q0 = normalize(q);
    this.roll0 = rollDeg(q);
    this.done = true;
  }

  /** Orientation relative to the neutral pose (device frame). */
  relative(q: Quat): Quat {
    return mul(conj(this.q0), normalize(q));
  }

  /** Tilt about the forward axis relative to the neutral pose, degrees (positive: right). */
  roll(q: Quat): number {
    return rollDeg(q) - this.roll0;
  }
}

export const STEER_DEADZONE = 8;
export const STEER_FULL = 30;

/** Tilt (degrees) to a sideways steering value in [-1, 1]. */
export function steer(rollDeg: number, deadzone = STEER_DEADZONE, full = STEER_FULL): number {
  const a = Math.abs(rollDeg);
  if (a < deadzone) return 0;
  return Math.sign(rollDeg) * Math.min(1, (a - deadzone) / (full - deadzone));
}
