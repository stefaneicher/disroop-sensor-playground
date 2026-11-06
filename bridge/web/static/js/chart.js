import { isNum } from './format.js';

// Y range covering all series, padded by 10 %, at least `minSpan` wide.
export function valueRange(series, minSpan) {
  const values = series.flat().filter(isNum);
  if (values.length === 0) return { min: -minSpan / 2, max: minSpan / 2 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  const pad = (max - min) * 0.1;
  min -= pad; max += pad;
  if (max - min < minSpan) {
    const mid = (min + max) / 2;
    min = mid - minSpan / 2; max = mid + minSpan / 2;
  }
  return { min, max };
}

// Samples are right-aligned: the newest is at x = width. Missing samples become null (gap).
export function toPoints(samples, range, { width, height, capacity }) {
  const step = capacity > 1 ? width / (capacity - 1) : 0;
  const offset = capacity - samples.length;
  const span = range.max - range.min || 1;
  return samples.map((v, i) => (isNum(v)
    ? { x: (offset + i) * step, y: height - ((v - range.min) / span) * height }
    : null));
}
