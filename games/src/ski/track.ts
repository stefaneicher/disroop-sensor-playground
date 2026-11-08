/** Downhill course model: sections (length, gradient, turn) -> smooth 3D centre line sampled every STEP metres. */

export const STEP = 2;

export type PropKind =
  | 'startHouse' | 'finish' | 'wixi' | 'tunnel' | 'bridge' | 'stand' | 'house' | 'hut' | 'lift' | 'forest' | 'cliff' | 'cablecar' | 'tower' | 'train';

export interface Prop {
  kind: PropKind;
  /** Position inside the section, 0..1. */
  at: number;
  /** Side of the piste: -1 left, 1 right, 0 across/over the piste. */
  side?: -1 | 0 | 1;
  size?: number;
}

export interface Jump {
  /** Position inside the section, 0..1, of the take-off lip. */
  at: number;
  /** The ground falls away by this many metres ... */
  drop: number;
  /** ... over this many metres of piste. */
  gap: number;
}

export interface Section {
  name: string;
  length: number;
  /** Gradient in percent (positive: downhill). */
  slope: number;
  /** Total heading change in degrees (positive: right turn). */
  turn: number;
  /** Piste width in metres. */
  width: number;
  jump?: Jump;
  props?: Prop[];
  /** Tree density 0..1 along the piste (0 = alpine, no trees). */
  trees?: number;
  /** Edge protection: orange fence (default), tall B-nets, or nothing. */
  nets?: 'fence' | 'high' | 'none';
  /** Short description for the HUD banner. */
  info?: string;
}

export interface CourseDef {
  id: 'lauberhorn' | 'streif';
  title: string;
  place: string;
  /** Official numbers (shown in the menu). */
  facts: string[];
  /** Official vertical drop in metres, used to scale the gradients. */
  drop: number;
  sections: Section[];
  /** Length of the run-out behind the finish line (the last section(s)), metres. */
  runout: number;
  /** Air-drag factor (course calibration so the ideal tuck run lands near the record). */
  drag?: number;
  /** Reference time of a clean run in seconds (for the ghost/medal thresholds). */
  goldTime: number;
  /** Mountain skyline: names of the peaks seen from the course. */
  skyline: 'bernese' | 'kaiser';
}

export interface Sample {
  s: number;
  x: number;
  y: number;
  z: number;
  /** Heading in radians; 0 looks along -z, positive turns right (towards +x). */
  heading: number;
  /** Heading change per metre. */
  curv: number;
  /** Local gradient as fraction (positive: downhill), including jumps. */
  grad: number;
  width: number;
  section: number;
}

const smoothstep = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

function boxFilter(a: Float64Array, radius: number): Float64Array {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(a.length - 1, i + radius); j++) {
      sum += a[j]!;
      n++;
    }
    out[i] = sum / n;
  }
  return out;
}

export class Track {
  readonly def: CourseDef;
  readonly samples: Sample[] = [];
  readonly length: number;
  /** Distance of the finish line. */
  readonly finish: number;
  /** Start of each section in metres. */
  readonly starts: number[] = [];

  constructor(def: CourseDef) {
    this.def = def;
    let total = 0;
    for (const s of def.sections) {
      this.starts.push(total);
      total += s.length;
    }
    this.length = total;
    this.finish = total - def.runout;
    const n = Math.floor(total / STEP) + 1;
    const grad = new Float64Array(n);
    const curv = new Float64Array(n);
    const sec = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const s = i * STEP;
      let k = def.sections.length - 1;
      while (k > 0 && s < this.starts[k]!) k--;
      sec[i] = k;
      const sc = def.sections[k]!;
      grad[i] = sc.slope / 100;
      curv[i] = (sc.turn * Math.PI) / 180 / sc.length;
    }
    // soften the transitions between sections
    const g = boxFilter(grad, 6);
    const c = boxFilter(curv, 8);
    // scale the gradients so that the profile drops by exactly the official vertical drop
    let sum = 0;
    for (let i = 0; i < n - 1; i++) sum += g[i]! * STEP;
    const jumpDrop = def.sections.reduce((a, sc) => a + (sc.jump?.drop ?? 0), 0);
    const scale = sum > 0 ? (def.drop - jumpDrop) / sum : 1;
    let x = 0;
    let y = def.drop;
    let z = 0;
    let h = 0;
    for (let i = 0; i < n; i++) {
      const s = i * STEP;
      const sc = def.sections[sec[i]!]!;
      this.samples.push({ s, x, y, z, heading: h, curv: c[i]!, grad: g[i]! * scale, width: sc.width, section: sec[i]! });
      h += c[i]! * STEP;
      x += Math.sin(h) * STEP;
      z -= Math.cos(h) * STEP;
      y -= g[i]! * scale * STEP;
    }
    this.applyJumps();
  }

  /** Jumps lower the ground over `gap` metres; a small kicker rises just before the lip. */
  private applyJumps(): void {
    const sm = this.samples;
    const secs = this.def.sections;
    const offset = new Float64Array(sm.length);
    secs.forEach((sc, k) => {
      const j = sc.jump;
      if (!j) return;
      const s0 = this.starts[k]! + j.at * sc.length;
      for (let i = 0; i < sm.length; i++) {
        const s = sm[i]!.s;
        const kicker = 0.7 * smoothstep((s - (s0 - 7)) / 7) * (1 - smoothstep((s - s0) / 1.5));
        offset[i] = (offset[i] ?? 0) + kicker - j.drop * smoothstep((s - s0) / j.gap);
      }
    });
    for (let i = 0; i < sm.length; i++) sm[i]!.y += offset[i]!;
    for (let i = 0; i < sm.length - 1; i++) sm[i]!.grad = (sm[i]!.y - sm[i + 1]!.y) / STEP;
    sm[sm.length - 1]!.grad = sm[sm.length - 2]!.grad;
  }

  sampleAt(s: number): Sample {
    const f = Math.max(0, Math.min(this.samples.length - 1.001, s / STEP));
    const i = Math.floor(f);
    const a = this.samples[i]!;
    const b = this.samples[i + 1]!;
    const k = f - i;
    return {
      s,
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      z: a.z + (b.z - a.z) * k,
      heading: a.heading + (b.heading - a.heading) * k,
      curv: a.curv + (b.curv - a.curv) * k,
      grad: a.grad + (b.grad - a.grad) * k,
      width: a.width + (b.width - a.width) * k,
      section: k < 0.5 ? a.section : b.section,
    };
  }

  /** World position of a point `d` metres to the right of the centre line at `s`. */
  point(s: number, d: number): { x: number; y: number; z: number; heading: number } {
    const p = this.sampleAt(s);
    return { x: p.x + Math.cos(p.heading) * d, y: p.y, z: p.z + Math.sin(p.heading) * d, heading: p.heading };
  }

  sectionAt(s: number): number {
    let k = this.starts.length - 1;
    while (k > 0 && s < this.starts[k]!) k--;
    return k;
  }

  /** Control gates: every ~70 m, alternating red/blue, shifted towards the inside of the next bend. */
  gates(): { s: number; offset: number; width: number; colour: 'red' | 'blue' }[] {
    const out: { s: number; offset: number; width: number; colour: 'red' | 'blue' }[] = [];
    let i = 0;
    for (let s = 90; s < this.finish - 40; s += 64 + (i % 3) * 8, i++) {
      const p = this.sampleAt(s);
      const ahead = this.sampleAt(Math.min(this.length - 2, s + 40));
      const bend = Math.max(-1, Math.min(1, (p.curv + ahead.curv) * 60));
      const half = p.width / 2;
      out.push({ s, offset: bend * half * 0.35, width: Math.min(14, p.width * 0.5), colour: i % 2 === 0 ? 'red' : 'blue' });
    }
    return out;
  }
}
