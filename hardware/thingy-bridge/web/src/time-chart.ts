// Canvas time chart: nice Y ticks with unit, time X axis, min/max decimation, crosshair + tooltip,
// legend toggles, Auto/fixed Y scale, wheel/pinch zoom and drag panning (window shared via ChartGroup).
import { TimeSeries } from './series.ts';
import { decimate, extent, padRange, type Range } from './decimate.ts';
import { niceScale, stepDecimals, fmtTick, timeTicks } from './axis.ts';
import { clockPrecise, fmtRelativePrecise } from './timefmt.ts';
import { fmtSigned } from './format.ts';
import { panView, pauseView, pinchFactor, wheelFactor, zoomView, type TimeView } from './timewindow.ts';
import type { ChartGroup, Frame } from './chart-group.ts';

export interface SeriesDef { key: string; label: string; color: string }
export interface TimeChartOptions {
  series?: readonly SeriesDef[];
  unit: string;
  digits?: number;
  minSpan?: number;
  fixedRange: Range;
  autoScale?: boolean;
  capacity?: number;
  gapMs?: number;
}

export const XYZ: readonly SeriesDef[] = [
  { key: 'x', label: 'x', color: '#f87171' },
  { key: 'y', label: 'y', color: '#4ade80' },
  { key: 'z', label: 'z', color: '#60a5fa' },
];

const M = { l: 48, r: 10, t: 8, b: 20 };
const FONT = '10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const C = {
  grid: 'rgba(148,163,184,.10)', zero: 'rgba(148,163,184,.35)', axis: '#374151', label: '#9ca3af',
  cross: 'rgba(163,230,53,.75)', tipBg: 'rgba(17,24,39,.94)', tipLine: '#4d7c0f', text: '#f9fafb', accent: '#a3e635',
};

type Plot = { x: number; y: number; w: number; h: number };
type Gesture =
  | { kind: 'drag'; x: number; view: TimeView; moved: boolean }
  | { kind: 'pinch'; dist: number; frac: number; view: TimeView };

export class TimeChart {
  readonly data: TimeSeries;
  #canvas: HTMLCanvasElement;
  #group: ChartGroup;
  #series: readonly SeriesDef[];
  #hidden = new Set<string>();
  #legend: HTMLButtonElement[] = [];
  #scaleButton: HTMLButtonElement | null;
  #opts: Required<Omit<TimeChartOptions, 'series'>>;
  #size = { w: 0, h: 0 };
  #pointers = new Map<number, number>();
  #gesture: Gesture | null = null;

  constructor(root: HTMLElement, group: ChartGroup, options: TimeChartOptions) {
    const canvas = root.querySelector('canvas');
    const legend = root.querySelector<HTMLElement>('[data-legend]');
    if (!canvas || !legend) throw new Error(`#${root.id}: chart needs a canvas and [data-legend]`);
    this.#canvas = canvas;
    this.#group = group;
    this.#series = options.series ?? XYZ;
    this.#opts = { digits: 2, minSpan: 1, autoScale: true, capacity: 6000, gapMs: 1500, ...options };
    this.data = new TimeSeries(this.#series.map((s) => s.key), this.#opts.capacity);
    this.#buildLegend(legend);
    this.#scaleButton = root.querySelector<HTMLButtonElement>('[data-yscale]');
    this.#scaleButton?.addEventListener('click', () => this.#setAutoScale(!this.#opts.autoScale));
    this.#setAutoScale(this.#opts.autoScale);
    new ResizeObserver(() => {
      this.#size = { w: canvas.clientWidth, h: canvas.clientHeight };
      group.invalidate();
    }).observe(canvas);
    this.#bindPointer();
    group.add(this);
  }

  get oldest(): number | null { return this.data.oldest; }

  push(t: number, values: Readonly<Record<string, unknown>> | null | undefined): void {
    this.data.push(t, values);
    this.#series.forEach((s, i) => {
      const b = this.#legend[i]?.querySelector('b');
      const text = fmtSigned(values?.[s.key], this.#opts.digits);
      if (b && b.textContent !== text) b.textContent = text;
    });
    if (!this.#group.live) this.#group.invalidate();
  }

  #buildLegend(legend: HTMLElement): void {
    const doc = legend.ownerDocument;
    this.#legend = this.#series.map((s) => {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'series';
      btn.style.setProperty('--c', s.color);
      btn.setAttribute('aria-pressed', 'true');
      btn.title = `${s.label} ein-/ausblenden`;
      const label = doc.createElement('span');
      label.textContent = s.label;
      const value = doc.createElement('b');
      value.textContent = '–';
      btn.append(label, value);
      btn.addEventListener('click', () => {
        if (this.#hidden.has(s.key)) this.#hidden.delete(s.key); else this.#hidden.add(s.key);
        btn.setAttribute('aria-pressed', String(!this.#hidden.has(s.key)));
        this.#group.invalidate();
      });
      return btn;
    });
    legend.replaceChildren(...this.#legend);
  }

  #setAutoScale(auto: boolean): void {
    this.#opts.autoScale = auto;
    if (this.#scaleButton) {
      this.#scaleButton.setAttribute('aria-pressed', String(auto));
      this.#scaleButton.textContent = auto ? 'Y: Auto' : 'Y: Fest';
      this.#scaleButton.title = auto ? 'Y-Achse passt sich an – klicken für feste Skala' : 'Feste Y-Skala – klicken für Auto';
    }
    this.#group.invalidate();
  }

  #plot(): Plot {
    return { x: M.l, y: M.t, w: Math.max(1, this.#size.w - M.l - M.r), h: Math.max(1, this.#size.h - M.t - M.b) };
  }

  // ---------- interaction ----------

  #localX(e: PointerEvent | WheelEvent | MouseEvent): number { return e.clientX - this.#canvas.getBoundingClientRect().left; }
  #frac(x: number): number { const p = this.#plot(); return (x - p.x) / p.w; }

  #hoverAt(x: number): void {
    const { t0, t1 } = this.#window();
    const f = this.#frac(x);
    if (f < 0 || f > 1) { this.#group.setHover(null); return; }
    this.#group.setHover({ t: t0 + f * (t1 - t0), source: this });
  }

  #window(): { t0: number; t1: number } {
    const t1 = this.#group.view.end ?? Date.now();
    return { t0: t1 - this.#group.view.span, t1 };
  }

  #pinchState(): { dist: number; center: number } {
    const [a = 0, b = 0] = [...this.#pointers.values()];
    return { dist: Math.abs(a - b), center: (a + b) / 2 };
  }

  #bindPointer(): void {
    const cv = this.#canvas;
    const group = this.#group;
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      group.zoom(wheelFactor(e.deltaY * scale), this.#frac(this.#localX(e)));
    }, { passive: false });
    cv.addEventListener('dblclick', () => group.reset());
    cv.addEventListener('pointerdown', (e) => {
      const x = this.#localX(e);
      if (e.pointerType === 'mouse') {
        if (e.button !== 0) return;
        this.#gesture = { kind: 'drag', x, view: group.view, moved: false };
        cv.setPointerCapture(e.pointerId);
        return;
      }
      this.#pointers.set(e.pointerId, x);
      cv.setPointerCapture(e.pointerId);
      if (this.#pointers.size === 1) this.#hoverAt(x);
      if (this.#pointers.size === 2) {
        const { dist, center } = this.#pinchState();
        this.#gesture = { kind: 'pinch', dist, frac: this.#frac(center), view: group.view };
        group.setHover(null);
      }
    });
    cv.addEventListener('pointermove', (e) => {
      const x = this.#localX(e);
      const g = this.#gesture;
      if (e.pointerType === 'mouse') {
        if (g?.kind === 'drag') {
          const dx = x - g.x;
          if (!g.moved && Math.abs(dx) < 3) return;
          g.moved = true;
          cv.classList.add('grabbing');
          const now = Date.now();
          const msPerPx = g.view.span / this.#plot().w;
          group.setHover(null);
          group.setView(panView(pauseView(g.view, now), now, -dx * msPerPx, group.limits()));
        } else this.#hoverAt(x);
        return;
      }
      if (!this.#pointers.has(e.pointerId)) return;
      this.#pointers.set(e.pointerId, x);
      if (g?.kind === 'pinch' && this.#pointers.size === 2) {
        group.setView(zoomView(g.view, Date.now(), pinchFactor(g.dist, this.#pinchState().dist), g.frac, group.limits()));
      } else if (this.#pointers.size === 1) this.#hoverAt(x);
    });
    const end = (e: PointerEvent): void => {
      this.#pointers.delete(e.pointerId);
      if (e.pointerType === 'mouse' || this.#pointers.size < 2) { this.#gesture = null; cv.classList.remove('grabbing'); }
      if (e.pointerType !== 'mouse' && this.#pointers.size === 0) group.setHover(null);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !this.#gesture) group.setHover(null); });
  }

  // ---------- drawing ----------

  draw(f: Frame): void {
    const { w, h } = this.#size;
    const ctx = this.#canvas.getContext('2d');
    if (!w || !h || !ctx) return;
    const dpr = globalThis.devicePixelRatio || 1;
    const [cw, ch] = [Math.round(w * dpr), Math.round(h * dpr)];
    if (this.#canvas.width !== cw || this.#canvas.height !== ch) { this.#canvas.width = cw; this.#canvas.height = ch; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;

    const p = this.#plot();
    const d = this.data;
    const from = Math.max(0, d.lowerBound(f.t0) - 1);
    const to = Math.min(d.length, d.lowerBound(f.t1) + 1);
    const keys = this.#series.map((s) => s.key).filter((k) => !this.#hidden.has(k));
    const range = this.#opts.autoScale ? padRange(extent(d, keys, from, to), this.#opts.minSpan) : this.#opts.fixedRange;
    const nice = niceScale(range.min, range.max, Math.max(2, Math.floor(p.h / 20)));
    // A fixed range is kept exactly; only the nice ticks inside it are drawn.
    const scale = this.#opts.autoScale ? nice
      : { ...nice, min: range.min, max: range.max, ticks: nice.ticks.filter((v) => v >= range.min && v <= range.max) };
    const xOf = (t: number): number => p.x + ((t - f.t0) / (f.t1 - f.t0)) * p.w;
    const yOf = (v: number): number => p.y + p.h * (1 - (v - scale.min) / (scale.max - scale.min));

    this.#drawYAxis(ctx, p, scale, yOf);
    this.#drawXAxis(ctx, p, f, xOf);

    ctx.save();
    ctx.beginPath(); ctx.rect(p.x, p.y - 1, p.w, p.h + 2); ctx.clip();
    for (const s of this.#series) {
      if (this.#hidden.has(s.key)) continue;
      const pts = decimate(d, s.key, from, to, f.t0, f.t1, p.w, this.#opts.gapMs);
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < pts.length; i += 2) {
        const v = pts[i + 1]!;
        if (Number.isNaN(v)) { pen = false; continue; }
        const [x, y] = [xOf(pts[i]!), yOf(v)];
        if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    }
    ctx.restore();

    if (!d.length) this.#centerText(ctx, p, 'warte auf Daten');
    if (!f.live) this.#badge(ctx, p, '❚❚ angehalten');
    if (f.hover && f.hover.t >= f.t0 && f.hover.t <= f.t1) this.#drawHover(ctx, p, f, xOf, yOf);
  }

  #drawYAxis(ctx: CanvasRenderingContext2D, p: Plot, scale: ReturnType<typeof niceScale>, yOf: (v: number) => number): void {
    const dec = stepDecimals(scale.step);
    ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.label;
    for (const v of scale.ticks) {
      const y = Math.round(yOf(v)) + 0.5;
      ctx.strokeStyle = v === 0 ? C.zero : C.grid;
      ctx.setLineDash(v === 0 && scale.min < 0 ? [4, 4] : []);
      ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + p.w, y); ctx.stroke();
      ctx.fillText(fmtTick(v, dec), p.x - 6, Math.min(Math.max(y, p.y + 5), p.y + p.h - 4));
    }
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(9, p.y + p.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillStyle = C.accent;
    ctx.fillText(this.#opts.unit, 0, 0);
    ctx.restore();
    ctx.strokeStyle = C.axis;
    ctx.beginPath(); ctx.moveTo(p.x + 0.5, p.y); ctx.lineTo(p.x + 0.5, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h - 0.5); ctx.stroke();
  }

  #drawXAxis(ctx: CanvasRenderingContext2D, p: Plot, f: Frame, xOf: (t: number) => number): void {
    const maxTicks = Math.max(2, Math.floor(p.w / (f.mode === 'clock' ? 80 : 62)));
    ctx.textBaseline = 'top'; ctx.fillStyle = C.label; ctx.lineWidth = 1;
    for (const tick of timeTicks(f.t0, f.t1, maxTicks, f.mode, f.now)) {
      const x = Math.round(xOf(tick.t)) + 0.5;
      ctx.strokeStyle = C.grid;
      ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y + p.h + 3); ctx.stroke();
      const half = ctx.measureText(tick.label).width / 2;
      ctx.textAlign = 'center';
      ctx.fillText(tick.label, Math.min(Math.max(x, p.x + half), p.x + p.w + M.r - half - 1), p.y + p.h + 5);
    }
    // X axis title in the free corner left of the first tick (the Y unit sits on the left edge).
    ctx.textAlign = 'left'; ctx.fillStyle = C.accent;
    ctx.fillText(f.mode === 'clock' ? 'Uhrzeit' : 'Zeit', 2, p.y + p.h + 5);
  }

  #drawHover(ctx: CanvasRenderingContext2D, p: Plot, f: Frame, xOf: (t: number) => number, yOf: (v: number) => number): void {
    const i = this.data.nearest(f.hover!.t);
    const t = i >= 0 && Math.abs(this.data.time(i) - f.hover!.t) <= this.#opts.gapMs ? this.data.time(i) : f.hover!.t;
    const x = Math.round(xOf(t)) + 0.5;
    ctx.strokeStyle = C.cross; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y + p.h); ctx.stroke();
    ctx.setLineDash([]);
    const rows: { text: string; color: string }[] = [];
    for (const s of this.#series) {
      if (this.#hidden.has(s.key) || i < 0 || t !== this.data.time(i)) continue;
      const v = this.data.value(s.key, i);
      if (Number.isNaN(v)) continue;
      const y = yOf(v);
      if (y >= p.y && y <= p.y + p.h) {
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      rows.push({ text: `${s.label.padEnd(5)} ${fmtSigned(v, this.#opts.digits)} ${this.#opts.unit}`, color: s.color });
    }
    if (f.hover!.source !== this) return;
    const head = f.mode === 'clock' ? clockPrecise(t) : fmtRelativePrecise(t - f.now);
    const lines = [{ text: head, color: C.accent }, ...rows];
    const lh = 14;
    const bw = Math.max(...lines.map((l) => ctx.measureText(l.text).width)) + 14;
    const bh = lines.length * lh + 8;
    const bx = x + 10 + bw > p.x + p.w ? x - 10 - bw : x + 10;
    const by = p.y + 4;
    ctx.fillStyle = C.tipBg; ctx.strokeStyle = C.tipLine;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, Math.min(bh, p.h + M.b - 6), 6); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, k) => { ctx.fillStyle = l.color; ctx.fillText(l.text, bx + 7, by + 5 + k * lh); });
  }

  #centerText(ctx: CanvasRenderingContext2D, p: Plot, text: string): void {
    ctx.fillStyle = C.label; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, p.x + p.w / 2, p.y + p.h / 2);
  }

  #badge(ctx: CanvasRenderingContext2D, p: Plot, text: string): void {
    const w = ctx.measureText(text).width + 12;
    const x = p.x + p.w - w - 4;
    ctx.fillStyle = 'rgba(77,124,15,.85)';
    ctx.beginPath(); ctx.roundRect(x, p.y + 3, w, 16, 8); ctx.fill();
    ctx.fillStyle = '#ecfccb'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 6, p.y + 11.5);
  }
}
