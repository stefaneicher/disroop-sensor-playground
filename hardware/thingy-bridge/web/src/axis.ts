// Axis math: "nice" value ticks (1-2-5 steps) and time ticks for chart axes.
import { fmtRelative } from './timefmt.ts';
import { clock } from './format.ts';

export interface Scale { min: number; max: number; step: number; ticks: number[] }
export type TimeMode = 'relative' | 'clock';
export interface TimeTick { t: number; label: string }

const MANTISSAS = [1, 2, 5, 10];

// Smallest 1-2-5 × 10^k step that is >= raw.
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  const m = MANTISSAS.find((x) => x * base >= raw * (1 - 1e-9)) ?? 10;
  return m * base;
}

const snap = (v: number, step: number): number => {
  const r = Math.round(v / step) * step;
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const fixed = Number(r.toFixed(digits));
  return Object.is(fixed, -0) ? 0 : fixed;
};

// Expands [min, max] outward to multiples of a nice step with at most maxTicks intervals.
export function niceScale(min: number, max: number, maxTicks = 5): Scale {
  if (!(max > min)) { const c = Number.isFinite(min) ? min : 0; min = c - 1; max = c + 1; }
  const intervals = Math.max(1, Math.floor(maxTicks));
  let step = niceStep((max - min) / intervals);
  for (;;) {
    const lo = Math.floor(min / step + 1e-9) * step;
    const hi = Math.ceil(max / step - 1e-9) * step;
    if (Math.round((hi - lo) / step) <= intervals) {
      const n = Math.round((hi - lo) / step);
      const ticks = Array.from({ length: n + 1 }, (_, i) => snap(lo + i * step, step));
      return { min: ticks[0]!, max: ticks[n]!, step, ticks };
    }
    step = niceStep(step * 1.0001);
  }
}

export function stepDecimals(step: number): number {
  if (!(step > 0)) return 0;
  for (let d = 0; d < 10; d++) if (Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-6) return d;
  return 10;
}

// Axis label: true minus sign, no "-0".
export function fmtTick(value: number, decimals: number): string {
  const text = value.toFixed(decimals);
  if (Number(text) === 0) return (0).toFixed(decimals);
  return text.replace('-', '−');
}

export const TIME_STEPS_MS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600].map((s) => s * 1000);

export function timeStep(spanMs: number, maxTicks: number): number {
  const n = Math.max(1, maxTicks);
  return TIME_STEPS_MS.find((s) => spanMs / s <= n) ?? TIME_STEPS_MS[TIME_STEPS_MS.length - 1]!;
}

// Relative ticks are anchored at `now` (labels like −30 s … jetzt); clock ticks at wall-clock multiples.
export function timeTicks(t0: number, t1: number, maxTicks: number, mode: TimeMode, now: number): TimeTick[] {
  if (!(t1 > t0)) return [];
  const step = timeStep(t1 - t0, maxTicks);
  const ticks: TimeTick[] = [];
  if (mode === 'relative') {
    const first = now - Math.floor((now - t0) / step) * step;
    for (let t = first; t <= t1 + 1e-6; t += step) ticks.push({ t, label: fmtRelative(t - now) });
  } else {
    for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) ticks.push({ t, label: clock(t) });
  }
  return ticks;
}
