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

// Microphone is off by default (BLE stability); older bridges without mic_enabled count as on when a level arrives.
export function micView(sound) {
  const enabled = typeof sound?.mic_enabled === 'boolean' ? sound.mic_enabled : isNum(sound?.level_dbfs);
  if (!enabled) return { enabled, level: null, hint: 'Mikrofon aus' };
  const level = isNum(sound.level_dbfs) ? sound.level_dbfs : null;
  return { enabled, level, hint: level === null ? 'warte auf Daten' : '' };
}
