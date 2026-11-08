/** Ball flight: gravity, quadratic drag, Magnus effect from spin, bounce, net. Deterministic fixed step. */
import { COURT } from './court.ts';

export type V3 = [number, number, number];

export interface Ball {
  p: V3;
  v: V3;
  /** Spin in rad/s about the horizontal axis perpendicular to the flight; > 0 topspin, < 0 slice. */
  spin: number;
}

export type BallEvent = { type: 'bounce'; p: V3; t: number } | { type: 'net'; p: V3; t: number };

export const DT = 1 / 240;
export const G = 9.81;
const DRAG = 0.0206; // 0.5 * rho * Cd * A / m for a tennis ball
const MAGNUS = 0.00045;
const RESTITUTION = 0.74;
const FRICTION = 0.82;

export const cloneBall = (b: Ball): Ball => ({ p: [...b.p], v: [...b.v], spin: b.spin });

/** Advances the ball by dt (seconds) and returns what happened. */
export function step(b: Ball, dt: number, t = 0): BallEvent[] {
  const [vx, vy, vz] = b.v;
  const speed = Math.hypot(vx, vy, vz);
  const vh = Math.hypot(vx, vz);
  let ax = -DRAG * speed * vx;
  let ay = -G - DRAG * speed * vy;
  let az = -DRAG * speed * vz;
  if (b.spin !== 0 && vh > 0.1) {
    // omega = spin * (up x vhat_h); a = k * omega x v
    const ox = (b.spin * vz) / vh;
    const oz = (-b.spin * vx) / vh;
    ax += MAGNUS * (0 * vz - oz * vy);
    ay += MAGNUS * (oz * vx - ox * vz);
    az += MAGNUS * (ox * vy - 0 * vx);
  }
  b.v = [vx + ax * dt, vy + ay * dt, vz + az * dt];
  const prev: V3 = [...b.p];
  b.p = [prev[0] + b.v[0] * dt, prev[1] + b.v[1] * dt, prev[2] + b.v[2] * dt];
  const events: BallEvent[] = [];
  if (prev[2] !== 0 && Math.sign(prev[2]) !== Math.sign(b.p[2])) {
    const f = prev[2] / (prev[2] - b.p[2]);
    const y = prev[1] + (b.p[1] - prev[1]) * f;
    const x = prev[0] + (b.p[0] - prev[0]) * f;
    if (y < COURT.netHeight + COURT.ballRadius && Math.abs(x) < COURT.doublesWidth / 2 + 0.9) {
      b.p = [x, y, Math.sign(prev[2]) * COURT.ballRadius];
      b.v = [b.v[0] * 0.3, b.v[1] * 0.3, -b.v[2] * 0.08];
      b.spin = 0;
      events.push({ type: 'net', p: [...b.p], t });
    }
  }
  if (b.p[1] < COURT.ballRadius && b.v[1] < 0) {
    b.p[1] = COURT.ballRadius;
    // topspin kicks forward, slice skids and checks
    const kick = 1 + Math.max(-0.12, Math.min(0.12, b.spin / 2000));
    b.v = [b.v[0] * FRICTION * kick, -b.v[1] * RESTITUTION, b.v[2] * FRICTION * kick];
    b.spin *= 0.5;
    if (Math.abs(b.v[1]) < 0.4) b.v[1] = 0;
    events.push({ type: 'bounce', p: [...b.p], t });
  }
  return events;
}

/** Steps a ball for up to `seconds` and returns all events (the ball is modified). */
export function simulate(b: Ball, seconds: number): BallEvent[] {
  const out: BallEvent[] = [];
  for (let t = 0; t < seconds; t += DT) out.push(...step(b, DT, t));
  return out;
}

/** First event matching `stop` on a copy of the ball (t relative to now), or null within maxS. */
export function predict(b: Ball, stop: (e: BallEvent) => boolean, maxS = 4): BallEvent | null {
  const c = cloneBall(b);
  for (let t = DT; t < maxS; t += DT) {
    for (const e of step(c, DT, t)) if (stop(e)) return e;
  }
  return null;
}

/** Position and time where the ball (copy) first satisfies `at` after the optional bounce. */
export function predictPoint(b: Ball, at: (c: Ball, bounced: number) => boolean, maxS = 4): { p: V3; t: number; bounced: number } | null {
  const c = cloneBall(b);
  let bounced = 0;
  for (let t = DT; t < maxS; t += DT) {
    for (const e of step(c, DT, t)) if (e.type === 'bounce') bounced++;
    if (at(c, bounced)) return { p: [...c.p], t, bounced };
  }
  return null;
}

/**
 * A ball leaving `from` towards the landing point `target` (x, z) with roughly `speed` m/s horizontal
 * speed and `spin`. Bisects the vertical speed; lowers the pace if the net is in the way.
 */
export function launch(from: V3, target: [number, number], speed: number, spin: number): Ball {
  const dx = target[0] - from[0];
  const dz = target[1] - from[2];
  const dist = Math.hypot(dx, dz);
  const ux = dx / dist;
  const uz = dz / dist;
  let vh = speed;
  let best: Ball = { p: [...from], v: [ux * vh, 4, uz * vh], spin };
  for (let attempt = 0; attempt < 14; attempt++) {
    let lo = -6;
    let hi = 14;
    let clears = false;
    for (let i = 0; i < 30; i++) {
      const vy = (lo + hi) / 2;
      const b: Ball = { p: [...from], v: [ux * vh, vy, uz * vh], spin };
      const e = predict(b, (ev) => ev.type === 'bounce' || ev.type === 'net', 5);
      const reached = e ? Math.hypot(e.p[0] - from[0], e.p[2] - from[2]) * (e.type === 'net' ? 0 : 1) : Infinity;
      clears = e?.type === 'bounce';
      if (reached < dist) lo = vy;
      else hi = vy;
      best = b;
    }
    best = { p: [...from], v: [ux * vh, (lo + hi) / 2, uz * vh], spin };
    if (clears && predict(best, (ev) => ev.type === 'bounce' || ev.type === 'net', 5)?.type === 'bounce') return best;
    vh *= 0.9;
  }
  return best;
}
