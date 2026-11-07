// Artificial horizon (attitude indicator, SVG): sky/ground layer with pitch ladder, roll scale and pointer.
import { attitudeOf, horizonTransform } from './orientation.ts';
import type { Motion } from './telemetry.ts';

const SVG = 'http://www.w3.org/2000/svg';
export const UNITS_PER_DEG = 1.5;
const ROLL_MARKS = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60];

function el(doc: Document, tag: string, attrs: Record<string, string | number>, text?: string): SVGElement {
  const e = doc.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}

export function buildAttitude(ladder: SVGGElement, rollScale: SVGGElement): void {
  const doc = ladder.ownerDocument;
  for (let p = -60; p <= 60; p += 5) {
    if (p === 0) continue;
    const y = -p * UNITS_PER_DEG;
    const half = p % 10 === 0 ? 14 : 6;
    ladder.append(el(doc, 'line', { x1: -half, x2: half, y1: y, y2: y, class: p % 10 === 0 ? 'rung major' : 'rung' }));
    if (p % 10 === 0) {
      ladder.append(el(doc, 'text', { x: half + 3, y: y + 2.5, class: 'rung-label' }, String(Math.abs(p))));
      ladder.append(el(doc, 'text', { x: -half - 3, y: y + 2.5, class: 'rung-label end' }, String(Math.abs(p))));
    }
  }
  for (const r of ROLL_MARKS) {
    const len = r % 30 === 0 ? 7 : 4;
    rollScale.append(el(doc, r === 0 ? 'path' : 'line', r === 0
      ? { d: 'M0,-50 L-3.5,-56 L3.5,-56 Z', class: 'roll-zero' }
      : { y1: -50, y2: -50 - len, transform: `rotate(${r})`, class: 'roll-tick' }));
  }
}

export function renderAttitude(horizon: SVGGElement, pointer: SVGGElement, motion: Partial<Motion> | null | undefined): void {
  const a = attitudeOf(motion);
  const t = a ? horizonTransform(a, UNITS_PER_DEG) : 'rotate(0) translate(0 0)';
  if (horizon.getAttribute('transform') !== t) horizon.setAttribute('transform', t);
  const r = `rotate(${a ? -a.roll : 0})`;
  if (pointer.getAttribute('transform') !== r) pointer.setAttribute('transform', r);
}
