// Canvas line chart for x/y/z sensor history (thin rendering layer over chart.ts + ringbuffer.ts).
import { RingBuffer } from './ringbuffer.ts';
import { valueRange, toPoints, type Range, type Sample } from './chart.ts';
import { fmtSigned } from './format.ts';

export interface Axis { key: string; label: string; color: string }
type Values = Readonly<Record<string, Sample | undefined>> | null | undefined;

const XYZ: readonly Axis[] = [
  { key: 'x', label: 'x', color: '#f87171' },
  { key: 'y', label: 'y', color: '#4ade80' },
  { key: 'z', label: 'z', color: '#60a5fa' },
];

export interface LiveChartOptions {
  capacity?: number;
  minSpan?: number;
  digits?: number;
  axes?: readonly Axis[];
  fixedRange?: Range | null;
}

export class LiveChart {
  #canvas: HTMLCanvasElement;
  #legend: HTMLElement;
  #history: RingBuffer<Record<string, Sample>>;
  #minSpan: number;
  #digits: number;
  #axes: readonly Axis[];
  #fixedRange: Range | null;
  #dirty = true;

  constructor(root: HTMLElement, { capacity = 300, minSpan = 1, digits = 2, axes = XYZ, fixedRange = null }: LiveChartOptions = {}) {
    const canvas = root.querySelector('canvas');
    const legend = root.querySelector<HTMLElement>('[data-legend]');
    if (!canvas || !legend) throw new Error(`#${root.id}: chart needs a canvas and [data-legend]`);
    this.#canvas = canvas;
    this.#legend = legend;
    this.#axes = axes;
    legend.replaceChildren(...axes.map((a) => {
      const span = root.ownerDocument.createElement('span');
      span.style.color = a.color;
      span.textContent = `${a.label} –`;
      return span;
    }));
    this.#history = new RingBuffer(capacity);
    this.#minSpan = minSpan;
    this.#digits = digits;
    this.#fixedRange = fixedRange;
    new ResizeObserver(() => { this.#dirty = true; this.draw(); }).observe(canvas);
  }

  push(values: Values): void {
    this.#history.push(Object.fromEntries(this.#axes.map(({ key }) => [key, values?.[key] ?? null])));
    this.#axes.forEach((a, i) => {
      const span = this.#legend.children[i];
      if (span) span.textContent = `${a.label} ${fmtSigned(values?.[a.key], this.#digits)}`;
    });
    this.#dirty = true;
  }

  draw(): void {
    if (!this.#dirty) return;
    this.#dirty = false;
    const canvas = this.#canvas;
    const dpr = globalThis.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!width || !height || !ctx) return;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const samples = this.#history.toArray();
    const series = this.#axes.map(({ key }) => samples.map((s) => s[key] ?? null));
    const range = this.#fixedRange ?? valueRange(series, this.#minSpan);
    const pad = 8;
    const plot = { width, height: height - 2 * pad, capacity: this.#history.capacity };

    this.#drawGrid(ctx, range, width, height, pad);
    series.forEach((values, i) => {
      ctx.strokeStyle = this.#axes[i]!.color;
      ctx.lineWidth = 1.7;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      for (const p of toPoints(values, range, plot)) {
        if (!p) { pen = false; continue; }
        if (pen) ctx.lineTo(p.x, p.y + pad); else ctx.moveTo(p.x, p.y + pad);
        pen = true;
      }
      ctx.stroke();
    });
  }

  #drawGrid(ctx: CanvasRenderingContext2D, range: Range, width: number, height: number, pad: number): void {
    const yOf = (v: number): number => pad + (height - 2 * pad) * (1 - (v - range.min) / (range.max - range.min));
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148,163,184,.10)';
    for (let i = 1; i < 4; i++) {
      const y = Math.round((height * i) / 4) + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    if (range.min < 0 && range.max > 0) {
      ctx.strokeStyle = 'rgba(148,163,184,.35)';
      ctx.setLineDash([4, 4]);
      const y = Math.round(yOf(0)) + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(148,163,184,.75)';
    ctx.font = '10px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(fmtSigned(range.max, this.#digits), 6, 4);
    ctx.textBaseline = 'bottom';
    ctx.fillText(fmtSigned(range.min, this.#digits), 6, height - 4);
  }
}
