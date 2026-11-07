// Time-stamped multi-channel history backed by typed ring buffers (no per-sample allocation).
// Missing values are stored as NaN.
import { isNum } from './format.ts';

export interface SeriesSource { readonly length: number; time(i: number): number; value(key: string, i: number): number }

export class TimeSeries implements SeriesSource {
  readonly keys: readonly string[];
  #times: Float64Array;
  #values: Map<string, Float64Array>;
  #start = 0;
  #length = 0;

  constructor(keys: readonly string[], capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('capacity must be >= 1');
    this.keys = keys;
    this.#times = new Float64Array(capacity);
    this.#values = new Map(keys.map((k) => [k, new Float64Array(capacity)]));
  }

  get capacity(): number { return this.#times.length; }
  get length(): number { return this.#length; }

  push(t: number, values: Readonly<Record<string, unknown>> | null | undefined): void {
    const slot = (this.#start + this.#length) % this.capacity;
    this.#times[slot] = t;
    for (const [k, arr] of this.#values) {
      const v = values?.[k];
      arr[slot] = isNum(v) ? v : NaN;
    }
    if (this.#length < this.capacity) this.#length++;
    else this.#start = (this.#start + 1) % this.capacity;
  }

  #slot(i: number): number { return (this.#start + i) % this.capacity; }
  time(i: number): number { return this.#times[this.#slot(i)]!; }
  value(key: string, i: number): number { return this.#values.get(key)?.[this.#slot(i)] ?? NaN; }
  get oldest(): number | null { return this.#length ? this.time(0) : null; }
  get newest(): number | null { return this.#length ? this.time(this.#length - 1) : null; }

  // First index whose time is >= t (length if none). Times are assumed non-decreasing.
  lowerBound(t: number): number {
    let lo = 0;
    let hi = this.#length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.time(mid) < t) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  // Index of the sample closest in time to t, or -1 when empty.
  nearest(t: number): number {
    if (!this.#length) return -1;
    const i = this.lowerBound(t);
    if (i === 0) return 0;
    if (i === this.#length) return i - 1;
    return t - this.time(i - 1) <= this.time(i) - t ? i - 1 : i;
  }
}
