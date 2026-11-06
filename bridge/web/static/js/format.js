// Pure formatting helpers. Missing values render as a dash.
export const DASH = '–';

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function fmt(value, digits = 0, unit = '') {
  if (!isNum(value)) return DASH;
  const text = value.toFixed(digits);
  return unit ? `${text} ${unit}` : text;
}

export function fmtSigned(value, digits = 0) {
  if (!isNum(value)) return DASH;
  const text = Math.abs(value).toFixed(digits);
  if (Number(text) === 0) return text;
  return (value > 0 ? '+' : '−') + text;
}

const ORIENTATION_DE = {
  portrait: 'Hochformat',
  landscape: 'Querformat',
  reverse_portrait: 'Hochformat, umgekehrt',
  reverse_landscape: 'Querformat, umgekehrt',
};

export const orientationLabel = (o) => ORIENTATION_DE[o] ?? DASH;

const TAP_ARROWS = { 'X+': '→', 'X-': '←', 'Y+': '↑', 'Y-': '↓', 'Z+': '⊙', 'Z-': '⊗' };

export const tapArrow = (dir) => TAP_ARROWS[dir] ?? DASH;

const CARDINALS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];

export function cardinal(deg) {
  if (!isNum(deg)) return DASH;
  const norm = ((deg % 360) + 360) % 360;
  return CARDINALS[Math.round(norm / 45) % 8];
}

const pad2 = (n) => String(n).padStart(2, '0');

export function clock(ms) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
