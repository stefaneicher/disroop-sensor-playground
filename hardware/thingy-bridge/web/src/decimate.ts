// Min/max ("M4") decimation: per pixel bucket keep first, min, max and last sample in time order,
// so drawing thousands of samples stays fast while spikes remain visible.
import type { SeriesSource } from './series.ts';

export interface Range { min: number; max: number }

// Flat [t, v, t, v, …]; v = NaN marks a break in the line (missing value or time gap > gapMs).
export function decimate(
  src: SeriesSource, key: string, from: number, to: number,
  t0: number, t1: number, buckets: number, gapMs = Infinity,
): number[] {
  const out: number[] = [];
  const n = Math.max(1, Math.floor(buckets));
  const raw = to - from <= 2 * n;
  const width = (t1 - t0) / n || 1;
  let bucket = NaN;
  let first = -1; let last = -1; let lo = -1; let hi = -1;
  let prevT = NaN;

  const breakLine = (): void => { if (out.length && !Number.isNaN(out[out.length - 1]!)) out.push(NaN, NaN); };
  const emit = (i: number): void => { out.push(src.time(i), src.value(key, i)); };
  const flush = (): void => {
    if (first < 0) return;
    const picks = [...new Set([first, lo, hi, last])].sort((a, b) => a - b);
    picks.forEach(emit);
    first = last = lo = hi = -1;
  };

  for (let i = from; i < to; i++) {
    const t = src.time(i);
    const v = src.value(key, i);
    const gap = t - prevT > gapMs;
    prevT = t;
    if (Number.isNaN(v) || gap) { flush(); breakLine(); if (Number.isNaN(v)) continue; }
    if (raw) { emit(i); continue; }
    const b = Math.floor((t - t0) / width);
    if (b !== bucket) { flush(); bucket = b; }
    if (first < 0) { first = lo = hi = i; }
    if (v < src.value(key, lo)) lo = i;
    if (v > src.value(key, hi)) hi = i;
    last = i;
  }
  flush();
  if (out.length && Number.isNaN(out[out.length - 1]!)) out.length -= 2;
  return out;
}

// Min/max of the given keys over [from, to), ignoring NaN; null when there is no value.
export function extent(src: SeriesSource, keys: readonly string[], from: number, to: number): Range | null {
  let min = Infinity;
  let max = -Infinity;
  for (const k of keys) {
    for (let i = from; i < to; i++) {
      const v = src.value(k, i);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return min <= max ? { min, max } : null;
}

// Pads an extent by 10 % and enforces a minimum span around its centre.
export function padRange(r: Range | null, minSpan: number): Range {
  if (!r) return { min: -minSpan / 2, max: minSpan / 2 };
  const pad = (r.max - r.min) * 0.1;
  let { min, max } = { min: r.min - pad, max: r.max + pad };
  if (max - min < minSpan) {
    const mid = (min + max) / 2;
    min = mid - minSpan / 2; max = mid + minSpan / 2;
  }
  return { min, max };
}
