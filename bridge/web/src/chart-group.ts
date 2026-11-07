// Shared time window for all charts: one view (span/end), one hover time, one requestAnimationFrame loop.
import {
  DEFAULT_LIMITS, isLive, liveView, resolveWindow, togglePause, withSpan, zoomView, type Limits, type TimeView,
} from './timewindow.ts';
import type { TimeMode } from './axis.ts';

export interface Hover { t: number; source: object }
export interface Frame { now: number; t0: number; t1: number; live: boolean; mode: TimeMode; hover: Hover | null }
export interface Drawable { draw(frame: Frame): void; readonly oldest: number | null }

const LIVE_FRAME_MS = 1000 / 30;

export class ChartGroup {
  view: TimeView;
  mode: TimeMode = 'relative';
  hover: Hover | null = null;
  #preset: number;
  #charts: Drawable[] = [];
  #listeners: (() => void)[] = [];
  #frame = 0;
  #dirty = true;
  #lastDraw = 0;

  constructor(span = 30_000) {
    this.view = { span, end: null };
    this.#preset = span;
  }

  add(chart: Drawable): void { this.#charts.push(chart); this.invalidate(); }
  onChange(fn: () => void): void { this.#listeners.push(fn); }
  get live(): boolean { return isLive(this.view); }

  limits(): Limits {
    const oldest = this.#charts.reduce<number | null>((min, c) => (c.oldest === null ? min : Math.min(min ?? Infinity, c.oldest)), null);
    return { ...DEFAULT_LIMITS, oldest };
  }

  setView(view: TimeView): void {
    this.view = view;
    this.#listeners.forEach((fn) => fn());
    this.invalidate();
  }

  setSpan(span: number): void { this.#preset = span; this.setView(withSpan(this.view, span, Date.now(), this.limits())); }
  zoom(factor: number, anchorFrac: number): void { this.setView(zoomView(this.view, Date.now(), factor, anchorFrac, this.limits())); }
  togglePause(): void { this.setView(togglePause(this.view, Date.now())); }
  reset(): void { this.setView(liveView({ span: this.#preset, end: null })); }

  setMode(mode: TimeMode): void { this.mode = mode; this.#listeners.forEach((fn) => fn()); this.invalidate(); }
  setHover(hover: Hover | null): void { this.hover = hover; this.invalidate(); }

  invalidate(): void { this.#dirty = true; this.#schedule(); }

  #schedule(): void {
    if (!this.#frame) this.#frame = requestAnimationFrame((ts) => this.#tick(ts));
  }

  // Live windows scroll continuously (throttled to ~30 fps); paused windows redraw only when something changed.
  #tick(ts: number): void {
    this.#frame = 0;
    const live = this.live;
    if (this.#dirty || (live && ts - this.#lastDraw >= LIVE_FRAME_MS)) {
      this.#dirty = false;
      this.#lastDraw = ts;
      const now = Date.now();
      const frame: Frame = { now, ...resolveWindow(this.view, now), live, mode: this.mode, hover: this.hover };
      this.#charts.forEach((c) => c.draw(frame));
    }
    if (live) this.#schedule();
  }
}
