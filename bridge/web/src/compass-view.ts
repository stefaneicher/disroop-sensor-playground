// Heading instrument (SVG): rotating compass card, lubber line, heading trail, field magnitude and calibration hint.
import {
  compassScale, fieldMagnitude, fieldQuality, fmtHeading, headingFrom, HeadingFilter, HeadingTrail, unwrap,
} from './heading.ts';
import { cardinal, fmt } from './format.ts';
import type { Motion } from './telemetry.ts';

const SVG = 'http://www.w3.org/2000/svg';
export type CompassMode = 'heading' | 'north';
const MODE_KEY = 'thingy.compassMode';
const R = { face: 100, minor: 94, mid: 90, major: 86, label: 73, trail: 56 };

function el(doc: Document, tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = doc.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function need<T extends Element>(root: ParentNode, sel: string, type: { new(): T }): T {
  const e = root.querySelector(sel);
  if (!(e instanceof type)) throw new Error(`${sel} missing`);
  return e;
}

export class CompassInstrument {
  #card: SVGGElement;
  #pointer: SVGGElement;
  #trailGroup: SVGGElement;
  #heading: HTMLElement;
  #cardinal: HTMLElement;
  #field: HTMLElement;
  #quality: HTMLElement;
  #qualityLabel: HTMLElement;
  #hint: HTMLElement;
  #source: HTMLElement;
  #modeButtons: HTMLButtonElement[];
  #filter = new HeadingFilter(5);
  #trail = new HeadingTrail(15_000, 300);
  #mode: CompassMode;
  #smoothed: number | null = null;
  #cardAngle = 0;
  #pointerAngle = 0;
  #lastTrail = 0;

  constructor(root: HTMLElement) {
    const doc = root.ownerDocument;
    this.#card = need(root, '#compass-card', SVGGElement);
    this.#pointer = need(root, '#compass-pointer', SVGGElement);
    this.#trailGroup = need(root, '#compass-trail', SVGGElement);
    this.#heading = need(root, '#heading', HTMLElement);
    this.#cardinal = need(root, '#heading-cardinal', HTMLElement);
    this.#field = need(root, '#field-magnitude', HTMLElement);
    this.#quality = need(root, '#field-quality', HTMLElement);
    this.#qualityLabel = need(root, '#field-label', HTMLElement);
    this.#hint = need(root, '#compass-hint', HTMLElement);
    this.#source = need(root, '#heading-source', HTMLElement);
    this.#modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-compass-mode]')];
    this.#buildScale(doc, need(root, '#compass-scale', SVGGElement));
    this.#buildBezel(doc, need(root, '#compass-bezel', SVGGElement));
    let stored: string | null = null;
    try { stored = globalThis.localStorage?.getItem(MODE_KEY) ?? null; } catch { /* storage blocked */ }
    this.#mode = stored === 'north' ? 'north' : 'heading';
    this.#modeButtons.forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset['compassMode'] === 'north' ? 'north' : 'heading')));
    this.setMode(this.#mode);
  }

  #buildScale(doc: Document, group: SVGGElement): void {
    group.append(el(doc, 'circle', { r: R.trail, class: 'trail-ring' }));
    for (const t of compassScale()) {
      const inner = t.size === 'major' ? R.major : t.size === 'mid' ? R.mid : R.minor;
      group.append(el(doc, 'line', { y1: -R.face + 1, y2: -inner, transform: `rotate(${t.deg})`, class: `tick ${t.size}` }));
      if (!t.label) continue;
      const cls = t.cardinal ? (t.deg === 0 ? 'card-label cardinal north' : `card-label cardinal${t.deg % 90 ? ' inter' : ''}`) : 'card-label num';
      const text = el(doc, 'text', { transform: `rotate(${t.deg}) translate(0 ${-R.label})`, class: cls });
      text.textContent = t.label;
      group.append(text);
    }
  }

  // Fixed 45° index marks on the bezel, like an aviation heading indicator.
  #buildBezel(doc: Document, group: SVGGElement): void {
    for (let deg = 45; deg < 360; deg += 45) {
      group.append(el(doc, 'path', { d: 'M0,-101 L-3,-107 L3,-107 Z', transform: `rotate(${deg})`, class: 'index' }));
    }
  }

  setMode(mode: CompassMode): void {
    this.#mode = mode;
    try { globalThis.localStorage?.setItem(MODE_KEY, mode); } catch { /* storage blocked */ }
    this.#modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset['compassMode'] === mode)));
    this.#rotate();
  }

  update(motion: Partial<Motion> | null | undefined, now: number): void {
    const reading = headingFrom(motion);
    this.#smoothed = reading ? this.#filter.push(reading.deg) : null;
    if (this.#smoothed !== null) this.#trail.push(now, this.#smoothed);
    else this.#filter.reset();
    this.#source.textContent = reading ? (reading.source === 'thingy' ? 'Thingy' : 'berechnet (neigungskomp.)') : '–';
    this.#heading.textContent = fmtHeading(this.#smoothed);
    this.#cardinal.textContent = this.#smoothed === null ? '' : cardinal(this.#smoothed);

    const magnitude = fieldMagnitude(motion?.compass_ut);
    const q = fieldQuality(magnitude);
    this.#field.textContent = fmt(magnitude, 1, 'µT');
    this.#quality.dataset['level'] = q.level;
    this.#qualityLabel.textContent = q.label;
    this.#hint.textContent = q.hint;
    this.#hint.hidden = !q.hint;
    this.#rotate();
    if (now - this.#lastTrail >= 250) { this.#lastTrail = now; this.#drawTrail(now); }
  }

  #rotate(): void {
    const h = this.#smoothed ?? 0;
    const card = this.#mode === 'heading' ? -h : 0;
    const pointer = this.#mode === 'heading' ? 0 : h;
    this.#cardAngle = unwrap(this.#cardAngle, card);
    this.#pointerAngle = unwrap(this.#pointerAngle, pointer);
    this.#card.style.transform = `rotate(${this.#cardAngle.toFixed(2)}deg)`;
    this.#pointer.style.transform = `rotate(${this.#pointerAngle.toFixed(2)}deg)`;
  }

  #drawTrail(now: number): void {
    const doc = this.#trailGroup.ownerDocument;
    this.#trailGroup.replaceChildren(...this.#trail.points(now).map((p) => el(doc, 'circle', {
      r: (2.6 - 1.4 * p.age).toFixed(2),
      cy: -R.trail,
      transform: `rotate(${p.deg.toFixed(1)})`,
      opacity: (0.9 * (1 - p.age) + 0.08).toFixed(2),
    })));
  }
}
