// Canvas line chart for x/y/z sensor history (thin rendering layer over chart.js + ringbuffer.js).
import { RingBuffer } from './ringbuffer.js';
import { valueRange, toPoints } from './chart.js';
import { fmtSigned } from './format.js';

const XYZ = [
  { key: 'x', label: 'x', color: '#f87171' },
  { key: 'y', label: 'y', color: '#4ade80' },
  { key: 'z', label: 'z', color: '#60a5fa' },
];

export class LiveChart {
  #canvas;
  #legend;
  #history;
  #minSpan;
  #digits;
  #axes;
  #fixedRange;
  #dirty = true;

  constructor(root, { capacity = 300, minSpan = 1, digits = 2, axes = XYZ, fixedRange = null } = {}) {
    this.#canvas = root.querySelector('canvas');
    this.#legend = root.querySelector('[data-legend]');
    this.#axes = axes;
    this.#legend.replaceChildren(...axes.map((a) => {
      const span = root.ownerDocument.createElement('span');
      span.style.color = a.color;
      span.textContent = `${a.label} –`;
      return span;
    }));
    this.#history = new RingBuffer(capacity);
    this.#minSpan = minSpan;
    this.#digits = digits;
    this.#fixedRange = fixedRange;
    new ResizeObserver(() => { this.#dirty = true; this.draw(); }).observe(this.#canvas);
  }

  push(xyz) {
    this.#history.push(Object.fromEntries(this.#axes.map(({ key }) => [key, xyz?.[key] ?? null])));
    this.#axes.forEach((a, i) => { this.#legend.children[i].textContent = `${a.label} ${fmtSigned(xyz?.[a.key], this.#digits)}`; });
    this.#dirty = true;
  }

  draw() {
    if (!this.#dirty) return;
    this.#dirty = false;
    const canvas = this.#canvas;
    const dpr = globalThis.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const samples = this.#history.toArray();
    const series = this.#axes.map(({ key }) => samples.map((s) => s[key]));
    const range = this.#fixedRange ?? valueRange(series, this.#minSpan);
    const pad = 8;
    const plot = { width, height: height - 2 * pad, capacity: this.#history.capacity };

    this.#drawGrid(ctx, range, width, height, pad);
    series.forEach((values, i) => {
      ctx.strokeStyle = this.#axes[i].color;
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

  #drawGrid(ctx, range, width, height, pad) {
    const yOf = (v) => pad + (height - 2 * pad) * (1 - (v - range.min) / (range.max - range.min));
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
