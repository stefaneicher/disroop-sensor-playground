/** Human movement limits of the hand/wrist holding the device, relative to the neutral pose. */
import { pitchDeg, rollDeg, type Quat } from '../../input/quat.ts';

export const ROLL_LIMIT_DEG = 75; // measured with asin, so it saturates at 90°
export const PITCH_UP_LIMIT_DEG = 75;
export const PITCH_DOWN_LIMIT_DEG = 80;
export const TOTAL_LIMIT_DEG = 140; // total rotation angle away from the neutral pose
export const WARN_RATIO = 0.85;
export const ALARM_REPEAT_MS = 600;

export type LimitLevel = 'ok' | 'warn' | 'alarm';
export interface LimitState {
  roll: number;
  pitch: number;
  angle: number;
  /** Largest share of any limit used (1 = at the limit). */
  ratio: number;
  level: LimitLevel;
  axis: 'roll' | 'pitch' | 'total' | null;
}

/** `rel` is the orientation relative to the neutral pose (Calibration.relative). */
export function checkLimits(rel: Quat): LimitState {
  const roll = rollDeg(rel);
  const pitch = pitchDeg(rel);
  const angle = (2 * Math.acos(Math.min(1, Math.abs(rel[0]) / (Math.hypot(...rel) || 1))) * 180) / Math.PI;
  const shares: [LimitState['axis'], number][] = [
    ['roll', Math.abs(roll) / ROLL_LIMIT_DEG],
    ['pitch', pitch >= 0 ? pitch / PITCH_UP_LIMIT_DEG : -pitch / PITCH_DOWN_LIMIT_DEG],
    ['total', angle / TOTAL_LIMIT_DEG],
  ];
  let [axis, ratio] = shares[0]!;
  for (const [a, r] of shares) if (r > ratio) [axis, ratio] = [a, r];
  const level: LimitLevel = ratio > 1 ? 'alarm' : ratio >= WARN_RATIO ? 'warn' : 'ok';
  return { roll, pitch, angle, ratio, level, axis: level === 'ok' ? null : axis };
}

/** Rate limiter so the alarm tone repeats instead of firing every frame. */
export class AlarmGate {
  private last = -Infinity;
  fire(state: LimitState, nowMs: number): boolean {
    if (state.level !== 'alarm' || nowMs - this.last < ALARM_REPEAT_MS) return false;
    this.last = nowMs;
    return true;
  }
}
