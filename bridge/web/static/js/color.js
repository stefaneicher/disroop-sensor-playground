import { isNum } from './format.js';

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

// Sensor RGB divided by the clear channel gives the chromaticity; scaled to 0..255.
export function normalizeColor(c) {
  if (!c || ![c.r, c.g, c.b, c.clear].every(isNum)) return null;
  const ref = c.clear > 0 ? c.clear : Math.max(c.r, c.g, c.b);
  if (ref <= 0) return { r: 0, g: 0, b: 0 };
  return { r: clamp255((c.r / ref) * 255), g: clamp255((c.g / ref) * 255), b: clamp255((c.b / ref) * 255) };
}

const hex2 = (v) => clamp255(v).toString(16).padStart(2, '0');

export function rgbToHex(c) {
  if (!c || ![c.r, c.g, c.b].every(isNum)) return null;
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
}

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? '');
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
