import { isNum } from './format.ts';
import type { Num } from './telemetry.ts';

export interface Rgb { r: number; g: number; b: number }
type Maybe<T> = T | null | undefined;
export type SensorColor = Maybe<{ r?: Num; g?: Num; b?: Num; clear?: Num }>;

const clamp255 = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

// Sensor RGB divided by the clear channel gives the chromaticity; scaled to 0..255.
export function normalizeColor(c: SensorColor): Rgb | null {
  if (!c || !isNum(c.r) || !isNum(c.g) || !isNum(c.b) || !isNum(c.clear)) return null;
  const ref = c.clear > 0 ? c.clear : Math.max(c.r, c.g, c.b);
  if (ref <= 0) return { r: 0, g: 0, b: 0 };
  return { r: clamp255((c.r / ref) * 255), g: clamp255((c.g / ref) * 255), b: clamp255((c.b / ref) * 255) };
}

const hex2 = (v: number): string => clamp255(v).toString(16).padStart(2, '0');

export function rgbToHex(c: Maybe<{ r?: Num; g?: Num; b?: Num }>): string | null {
  if (!c || !isNum(c.r) || !isNum(c.g) || !isNum(c.b)) return null;
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
}

export function hexToRgb(hex: Maybe<string>): Rgb | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? '');
  if (!m) return null;
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
}
