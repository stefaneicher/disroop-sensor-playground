// Time labels for chart axes and tooltips (German, true minus sign).
import { clock } from './format.ts';

const pad2 = (n: number): string => String(n).padStart(2, '0');

// Axis label relative to now: "jetzt", "−30 s", "−1 min", "−1:30 min" (rounded to whole seconds).
export function fmtRelative(deltaMs: number): string {
  const s = Math.round(Math.abs(deltaMs) / 1000);
  if (s === 0) return 'jetzt';
  const sign = deltaMs < 0 ? '−' : '+';
  if (s < 60) return `${sign}${s} s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${sign}${m} min` : `${sign}${m}:${pad2(rest)} min`;
}

// Tooltip label relative to now with tenths: "−12.3 s", "−1:05.2 min".
export function fmtRelativePrecise(deltaMs: number): string {
  const tenths = Math.round(Math.abs(deltaMs) / 100);
  if (tenths === 0) return 'jetzt';
  const sign = deltaMs < 0 ? '−' : '+';
  const s = tenths / 10;
  if (s < 60) return `${sign}${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${sign}${m}:${(s - m * 60).toFixed(1).padStart(4, '0')} min`;
}

// Wall-clock time with tenths: "10:38:47.3".
export function clockPrecise(ms: number): string {
  const tenth = Math.floor((((ms % 1000) + 1000) % 1000) / 100);
  return `${clock(ms)}.${tenth}`;
}

export function fmtSpan(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return s % 60 === 0 ? `${m} min` : `${m}:${pad2(s % 60)} min`;
}
