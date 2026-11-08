/** Wrist limits while holding the Thingy like handlebars; `rel` is the orientation relative to the calibrated neutral pose. */
import { pitchDeg, rollDeg, type Quat } from '../core/quat.ts';

export const SKI_ROLL_LIMIT_DEG = 75;
export const SKI_PITCH_UP_LIMIT_DEG = 70;
export const SKI_PITCH_DOWN_LIMIT_DEG = 80;
export const SKI_WARN_RATIO = 0.85;
export const SKI_ALARM_REPEAT_MS = 700;

export type SkiLimitLevel = 'ok' | 'warn' | 'alarm';
export interface SkiLimitState {
  roll: number;
  pitch: number;
  ratio: number;
  level: SkiLimitLevel;
  axis: 'roll' | 'pitch' | null;
}

export function checkSkiLimits(rel: Quat): SkiLimitState {
  const roll = rollDeg(rel);
  const pitch = pitchDeg(rel);
  const r = Math.abs(roll) / SKI_ROLL_LIMIT_DEG;
  const p = pitch >= 0 ? pitch / SKI_PITCH_UP_LIMIT_DEG : -pitch / SKI_PITCH_DOWN_LIMIT_DEG;
  const axis = r >= p ? 'roll' : 'pitch';
  const ratio = Math.max(r, p);
  const level: SkiLimitLevel = ratio > 1 ? 'alarm' : ratio >= SKI_WARN_RATIO ? 'warn' : 'ok';
  return { roll, pitch, ratio, level, axis: level === 'ok' ? null : axis };
}

/** Lets the alarm tone repeat at a fixed rate instead of every frame. */
export class AlarmGate {
  private last = -Infinity;
  fire(level: SkiLimitLevel, nowMs: number): boolean {
    if (level !== 'alarm' || nowMs - this.last < SKI_ALARM_REPEAT_MS) return false;
    this.last = nowMs;
    return true;
  }
}
