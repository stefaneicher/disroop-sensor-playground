import { isNum } from './format.ts';

export type Level = 'good' | 'warn' | 'bad' | 'none';

export function co2Level(ppm: unknown): { level: Level; label: string } {
  if (!isNum(ppm)) return { level: 'none', label: '' };
  if (ppm < 800) return { level: 'good', label: 'gut' };
  if (ppm < 1500) return { level: 'warn', label: 'mässig' };
  return { level: 'bad', label: 'schlecht' };
}

export function batteryLevel(pct: unknown): Level {
  if (!isNum(pct)) return 'none';
  if (pct > 40) return 'good';
  if (pct > 15) return 'warn';
  return 'bad';
}

const RSSI_STEPS = [-55, -70, -80, -90];

export function rssiBars(dbm: unknown): number {
  if (!isNum(dbm)) return 0;
  const below = RSSI_STEPS.findIndex((step) => dbm >= step);
  return below === -1 ? 0 : RSSI_STEPS.length - below;
}

export type BatteryTrend = 'charging' | 'discharging' | 'unknown';
export interface BatteryTrendView { trend: BatteryTrend; text: string }
export const BATTERY_TREND_TITLE = 'geschätzt aus dem Verlauf des Akkustands';

// device.battery_trend is a heuristic from the bridge; a missing or unexpected value counts as "unknown".
export function batteryTrendView(trend: unknown): BatteryTrendView {
  if (trend === 'charging') return { trend, text: '⚡ lädt' };
  if (trend === 'discharging') return { trend, text: 'Akkubetrieb' };
  return { trend: 'unknown', text: '?' };
}
