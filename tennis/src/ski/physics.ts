/** Skier physics on the track: gravity along the slope, drag (tuck), carving, ballistic jumps, nets, gates. */
import type { Track } from './track.ts';

export const G = 9.81;
const MU = 0.02; // snow friction
const C_STAND = 0.0024; // drag per metre (½ρ·Cd·A/m), upright
const C_TUCK = 0.0013; // in the tuck
const A_LAT = 14; // max lateral acceleration on the edges (m/s²)
const NET_MARGIN = 1.5;
export const PENALTY_GATE = 0.5;

export interface SkierState {
  /** Distance along the course, lateral offset to the right of the centre line (m). */
  s: number;
  d: number;
  /** Heading relative to the piste (rad, positive: pointing right). */
  psi: number;
  /** Speed along the snow (m/s). */
  v: number;
  /** Height of the skis and vertical speed (m, m/s). */
  y: number;
  vy: number;
  air: boolean;
  airTime: number;
  t: number;
  penalty: number;
  crashes: number;
  gatesHit: number;
  gatesMissed: number;
  maxV: number;
  finished: boolean;
  /** Smoothed lean for the figure (-1..1). */
  lean: number;
  nextGate: number;
}

export interface SkiInput {
  /** -1 (left) .. 1 (right). */
  steer: number;
  /** 0 upright .. 1 full tuck. */
  tuck: number;
  /** Pre-jump / hop. */
  jump: boolean;
}

export type SkiEvent =
  | { type: 'land'; impact: number }
  | { type: 'crash'; impact: number }
  | { type: 'net' }
  | { type: 'gate'; ok: boolean; index: number }
  | { type: 'section'; index: number }
  | { type: 'finish' };

export function newSkier(): SkierState {
  return { s: 0, d: 0, psi: 0, v: 0, y: 0, vy: 0, air: false, airTime: 0, t: 0, penalty: 0, crashes: 0, gatesHit: 0, gatesMissed: 0, maxV: 0, finished: false, lean: 0, nextGate: 0 };
}

export function startSkier(track: Track): SkierState {
  const k = newSkier();
  k.y = track.sampleAt(0).y;
  k.v = 0;
  return k;
}

export interface World {
  track: Track;
  gates: ReturnType<Track['gates']>;
}

/** Advances the skier by dt seconds and returns what happened. */
export function stepSkier(w: World, k: SkierState, input: SkiInput, dt: number): SkiEvent[] {
  const ev: SkiEvent[] = [];
  if (k.finished) return ev;
  const tr = w.track;
  const prevSection = tr.sectionAt(k.s);
  k.t += dt;
  const p = tr.sampleAt(k.s);
  const grad = p.grad;
  const sinT = grad / Math.sqrt(1 + grad * grad);

  // speed along the snow; a push-off in the start gate gives the first metres
  const tuck = k.air ? Math.max(input.tuck, 0.5) : input.tuck;
  const c = (C_STAND + (C_TUCK - C_STAND) * tuck) * (tr.def.drag ?? 1);
  const carve = k.air ? 0 : 0.35 * Math.abs(input.steer) * Math.min(1, k.v / 25) + 2.2 * (1 - Math.cos(k.psi));
  let a = G * sinT - MU * G - c * k.v * k.v - carve;
  if (k.s < 6 && k.v < 6) a += 3.5; // start push
  k.v = Math.max(0, k.v + a * dt);
  k.maxV = Math.max(k.maxV, k.v);

  // steering: heading relative to the piste
  const rateMax = Math.min(1.1, A_LAT / Math.max(k.v, 6));
  const control = k.air ? 0.25 : 1;
  k.psi += (input.steer * rateMax * control - p.curv * k.v * Math.cos(k.psi)) * dt;
  k.psi = Math.max(-1.25, Math.min(1.25, k.psi));
  k.lean += (input.steer - k.lean) * Math.min(1, dt * 8);

  const ds = k.v * Math.cos(k.psi) * dt;
  k.d += k.v * Math.sin(k.psi) * dt;
  const s0 = k.s;
  k.s = Math.min(tr.length, k.s + ds);

  // vertical: follow the ground or fly
  const g1 = tr.sampleAt(k.s).y;
  const g0 = tr.sampleAt(s0).y;
  if (!k.air) {
    const vyGround = dt > 0 ? (g1 - g0) / dt : 0;
    const yBall = k.y + k.vy * dt - 0.5 * G * dt * dt;
    if (input.jump && k.v > 3) {
      k.air = true;
      k.vy = vyGround + 2.4;
      k.y = yBall;
      k.airTime = 0;
    } else if (yBall > g1 + 0.03 && k.vy - vyGround > -0.5 && k.v > 6) {
      k.air = true;
      k.vy = k.vy - G * dt;
      k.y = yBall;
      k.airTime = 0;
    } else {
      k.y = g1;
      k.vy = vyGround;
    }
  } else {
    k.airTime += dt;
    k.vy -= G * dt;
    k.y += k.vy * dt;
    if (k.y <= g1) {
      const vyGround = dt > 0 ? (g1 - g0) / dt : 0;
      const impact = Math.max(0, -(k.vy - vyGround));
      k.y = g1;
      k.vy = vyGround;
      k.air = false;
      const soft = 1 - 0.6 * Math.min(1, Math.max(0, 1 - input.tuck));
      const loss = Math.min(0.6, Math.max(0, impact - 6) * 0.035 * (0.6 + 0.4 * soft));
      k.v *= 1 - loss;
      if (impact > 17) {
        k.crashes++;
        k.v *= 0.35;
        ev.push({ type: 'crash', impact });
      } else if (k.airTime > 0.25) ev.push({ type: 'land', impact });
    }
  }

  // nets at the piste edge
  const lim = p.width / 2 + NET_MARGIN;
  if (Math.abs(k.d) > lim) {
    k.d = Math.sign(k.d) * lim;
    k.psi = -Math.sign(k.d) * 0.25;
    k.v *= 0.45;
    k.crashes++;
    ev.push({ type: 'net' });
  }

  // gates
  while (k.nextGate < w.gates.length && w.gates[k.nextGate]!.s <= k.s) {
    const gt = w.gates[k.nextGate]!;
    const ok = Math.abs(k.d - gt.offset) <= gt.width / 2;
    if (ok) k.gatesHit++;
    else {
      k.gatesMissed++;
      k.penalty += PENALTY_GATE;
    }
    ev.push({ type: 'gate', ok, index: k.nextGate });
    k.nextGate++;
  }
  const sec = tr.sectionAt(k.s);
  if (sec !== prevSection) ev.push({ type: 'section', index: sec });
  if (k.s >= tr.finish) {
    k.finished = true;
    ev.push({ type: 'finish' });
  }
  return ev;
}

/** Perfect-line driver for the demo, ghost and tests: tuck, follow the centre line with feed-forward on bends. */
export function autopilot(w: World, k: SkierState, skill = 1): SkiInput {
  const p = w.track.sampleAt(k.s);
  const rateMax = Math.min(1.1, A_LAT / Math.max(k.v, 6));
  const ff = (p.curv * k.v) / rateMax;
  const ahead = w.track.sampleAt(Math.min(w.track.length, k.s + k.v * 1.2));
  const target = Math.max(-1, Math.min(1, -ahead.curv * 400)) * p.width * 0.15;
  const desired = Math.max(-0.5, Math.min(0.5, (target - k.d) * 0.04));
  const steer = ff + (desired - k.psi) * 3.5 * skill;
  const bendy = Math.abs(ahead.curv) * k.v > 0.25;
  return { steer: Math.max(-1, Math.min(1, steer)), tuck: bendy ? 0.35 : 1, jump: false };
}
