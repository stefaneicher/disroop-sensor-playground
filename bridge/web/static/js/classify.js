import { isNum } from './format.js';

export function co2Level(ppm) {
  if (!isNum(ppm)) return { level: 'none', label: '' };
  if (ppm < 800) return { level: 'good', label: 'gut' };
  if (ppm < 1500) return { level: 'warn', label: 'mässig' };
  return { level: 'bad', label: 'schlecht' };
}

export function batteryLevel(pct) {
  if (!isNum(pct)) return 'none';
  if (pct > 40) return 'good';
  if (pct > 15) return 'warn';
  return 'bad';
}

const RSSI_STEPS = [-55, -70, -80, -90];

export function rssiBars(dbm) {
  if (!isNum(dbm)) return 0;
  const below = RSSI_STEPS.findIndex((step) => dbm >= step);
  return below === -1 ? 0 : RSSI_STEPS.length - below;
}
