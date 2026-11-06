import { isNum } from './format.js';

export const FLOOR_DBFS = -80;
const HOLD_MS = 1500;
const DECAY_DB_PER_S = 20;

export function dbfsToPercent(dbfs) {
  if (!isNum(dbfs)) return 0;
  const pct = ((dbfs - FLOOR_DBFS) / -FLOOR_DBFS) * 100;
  return Math.max(0, Math.min(100, pct));
}

// Peak-hold meter: rises instantly, holds, then falls linearly towards the current level.
export function updatePeak(peak, level, now) {
  if (!isNum(level)) return peak;
  if (!peak || level >= peak.value) return { value: level, at: now };
  const held = now - peak.at;
  if (held <= HOLD_MS) return peak;
  const decayed = peak.value - ((held - HOLD_MS) / 1000) * DECAY_DB_PER_S;
  return decayed > level ? { value: decayed, at: peak.at } : { value: level, at: now };
}
