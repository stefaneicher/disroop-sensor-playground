/**
 * Game state machine: serve, rally, point, match. Pure and deterministic: all randomness comes from
 * the seeded rng and all input arrives through update(). Times are game seconds.
 */
import { COURT, inServiceBox, inSingles, other, sideOf, type Who } from './court.ts';
import { CPU, cpuServe, cpuShot, type Difficulty, type ShotPlan } from './cpu.ts';
import { DT, launch, predictPoint, step, type Ball, type V3 } from './physics.ts';
import { mulberry32, type Rng } from './rng.ts';
import { newScore, scorePoint, servingSide, type Score } from './scoring.ts';
import type { Side, Stroke } from './swing.ts';

export const WINDOW = 0.25; // s, hit window around the ball arrival
export const REACH = 1.5; // m, lateral racket reach of the player
export const BASE_Z = 11.4; // players' ready position (|z|)
const RUN = 5.5; // m/s auto-run
const STEER = 3.5; // m/s added by tilt steering
const TOSS_DELAY = 1.0; // s until the automatic toss
const TOSS_VY = 5.2;
const SERVE_WINDOW: [number, number] = [0.3, 0.95]; // s after the toss
const POINT_PAUSE = 1.8;

export interface GameSwing {
  t: number; // game time of the peak
  speedKmh: number;
  side: Side;
  kind: Stroke;
}

export interface Input {
  steer: number; // -1..1
  swings: GameSwing[];
  serve: boolean; // toss now (button / space)
}

export type Timing = 'früh' | 'perfekt' | 'spät';

export type GameEvent =
  | { type: 'hit'; who: Who; speedKmh: number; kind: Stroke; timing?: Timing; serve: boolean }
  | { type: 'whiff'; timing: Timing | 'weit' }
  | { type: 'toss'; who: Who }
  | { type: 'bounce'; p: V3 }
  | { type: 'net' }
  | { type: 'fault'; double: boolean }
  | { type: 'point'; winner: Who; reason: string }
  | { type: 'game' | 'set' | 'match'; winner: Who };

export type Phase = 'serve' | 'rally' | 'point' | 'over';

interface Expect {
  who: Who;
  p: V3;
  t: number;
}

export interface Pos {
  x: number;
  z: number;
}

export class Game {
  t = 0;
  phase: Phase = 'serve';
  score: Score;
  ball: Ball = { p: [0, 1, BASE_Z], v: [0, 0, 0], spin: 0 };
  player: Pos = { x: 0, z: BASE_Z };
  cpu: Pos = { x: 0, z: -BASE_Z };
  /** Last stroke of the player for the HUD. */
  lastShot: { speedKmh: number; kind: Stroke; timing: Timing } | null = null;
  message = '';
  difficulty: Difficulty;
  expect: Expect | null = null;

  private rng: Rng;
  private phaseT = 0;
  private faults = 0;
  private tossT = -1;
  private inServe = false;
  private lastHitter: Who | null = null;
  private bounces = 0;
  private hitT = 0;
  private pending: { swing: GameSwing; offset: number } | null = null;
  private cpuStart = 0;

  constructor(opts: { difficulty?: Difficulty; seed?: number; firstServer?: Who; gamesPerSet?: number } = {}) {
    this.difficulty = opts.difficulty ?? 'mittel';
    this.rng = mulberry32(opts.seed ?? 52);
    this.score = newScore(opts.firstServer ?? 'player', { gamesPerSet: opts.gamesPerSet ?? 6, setsToWin: 1 });
    this.startServe();
  }

  get server(): Who {
    return servingSide(this.score);
  }

  /** Seconds since the toss, or -1 when the ball is still in hand. */
  get tossAge(): number {
    return this.tossT < 0 ? -1 : this.t - this.tossT;
  }

  update(dt: number, input: Input): GameEvent[] {
    const ev: GameEvent[] = [];
    for (let left = dt; left > 1e-9; left -= DT) {
      const h = Math.min(DT, left);
      this.t += h;
      this.tick(h, input, ev);
      input = { ...input, swings: [], serve: false }; // consumed on the first sub-step
    }
    return ev;
  }

  private tick(h: number, input: Input, ev: GameEvent[]): void {
    switch (this.phase) {
      case 'serve':
        this.serveTick(h, input, ev);
        break;
      case 'rally':
        this.rallyTick(h, input, ev);
        break;
      case 'point':
        this.flyBall(h, ev, false);
        if (this.t - this.phaseT > POINT_PAUSE) this.startServe();
        break;
      case 'over':
        this.flyBall(h, ev, false);
        break;
    }
  }

  // ---- serve -------------------------------------------------------------

  private startServe(): void {
    this.phase = 'serve';
    this.phaseT = this.t;
    this.tossT = -1;
    this.expect = null;
    this.pending = null;
    const deuce = this.score.deuceCourt();
    const s = this.server;
    // player: right = +x; cpu (facing +z): right = -x
    this.player = s === 'player' ? { x: deuce ? 0.8 : -0.8, z: COURT.halfLength + 0.4 } : { x: deuce ? 2.4 : -2.4, z: BASE_Z };
    this.cpu = s === 'cpu' ? { x: deuce ? -0.8 : 0.8, z: -COURT.halfLength - 0.4 } : { x: deuce ? -2.4 : 2.4, z: -BASE_Z };
    this.holdBall();
  }

  private holdBall(): void {
    const p = this.server === 'player' ? this.player : this.cpu;
    const dz = this.server === 'player' ? -0.3 : 0.3;
    this.ball = { p: [p.x + 0.3, 1.0, p.z + dz], v: [0, 0, 0], spin: 0 };
  }

  private serveTick(h: number, input: Input, ev: GameEvent[]): void {
    const s = this.server;
    if (this.tossT < 0) {
      if (this.t - this.phaseT >= TOSS_DELAY || (s === 'player' && input.serve)) {
        this.tossT = this.t;
        this.ball.v = [0, TOSS_VY, 0];
        ev.push({ type: 'toss', who: s });
      }
      return;
    }
    this.ball.p = [this.ball.p[0], this.ball.p[1] + this.ball.v[1] * h, this.ball.p[2]];
    this.ball.v = [0, this.ball.v[1] - 9.81 * h, 0];
    const age = this.t - this.tossT;
    if (s === 'player') {
      for (const sw of input.swings) {
        const a = sw.t - this.tossT;
        if (a >= SERVE_WINDOW[0] && a <= SERVE_WINDOW[1]) {
          this.playerServe(sw, a, ev);
          return;
        }
        ev.push({ type: 'whiff', timing: a < SERVE_WINDOW[0] ? 'früh' : 'spät' });
      }
    } else if (age >= 0.6) {
      const plan = cpuServe(this.rng, CPU[this.difficulty], this.score.deuceCourt());
      this.strike('cpu', plan, true, ev, { speedKmh: Math.round(plan.speed * 3.6), kind: 'forehand' });
      return;
    }
    if (this.ball.p[1] < 0.5 && this.ball.v[1] < 0) {
      // nobody hit the toss: catch it and toss again
      this.phaseT = this.t;
      this.tossT = -1;
      this.holdBall();
    }
  }

  private playerServe(sw: GameSwing, age: number, ev: GameEvent[]): void {
    const deuce = this.score.deuceCourt();
    const ideal = 0.6;
    const u = Math.max(-1, Math.min(1, (age - ideal) / 0.35)); // -1 early .. +1 late
    const timing: Timing = Math.abs(u) < 0.35 ? 'perfekt' : u < 0 ? 'früh' : 'spät';
    const sx = deuce ? -1 : 1;
    let x = sx * (2.0 + u * 1.2);
    let z = -4.8 - Math.max(0, sw.speedKmh - 120) / 60;
    if (u < -0.75) z = -COURT.serviceLine - 0.8; // too early: long
    if (u > 0.75) x = sx * (COURT.singlesHalfWidth + 0.5); // too late: wide
    if (sw.kind === 'slice') x += sx * 0.6;
    const speed = Math.max(14, Math.min(48, (sw.speedKmh / 3.6) * 0.95));
    this.lastShot = { speedKmh: sw.speedKmh, kind: sw.kind, timing };
    this.strike('player', { target: [x, z], speed, spin: sw.kind === 'slice' ? -60 : 60 }, true, ev, { speedKmh: sw.speedKmh, kind: sw.kind, timing });
  }

  // ---- rally -------------------------------------------------------------

  private strike(who: Who, plan: ShotPlan, serve: boolean, ev: GameEvent[], info: { speedKmh: number; kind: Stroke; timing?: Timing }): void {
    const from: V3 = [this.ball.p[0], Math.max(serve ? 2.4 : 0.5, this.ball.p[1]), this.ball.p[2]];
    this.ball = launch(from, plan.target, plan.speed, plan.spin);
    this.lastHitter = who;
    this.bounces = 0;
    this.inServe = serve;
    this.hitT = this.t;
    this.pending = null;
    this.phase = 'rally';
    this.cpuStart = this.t + CPU[this.difficulty].reaction;
    const ex: { type: 'hit'; who: Who; speedKmh: number; kind: Stroke; timing?: Timing; serve: boolean } = { type: 'hit', who, speedKmh: info.speedKmh, kind: info.kind, serve };
    if (info.timing) ex.timing = info.timing;
    ev.push(ex);
    this.expect = this.predictHit(other(who));
  }

  /** Where and when the receiver meets the ball: after its bounce, when it drops to hip height or passes the baseline. */
  private predictHit(who: Who): Expect | null {
    const sign = who === 'player' ? 1 : -1;
    const hit = predictPoint(
      this.ball,
      (c, bounced) =>
        bounced >= 1 && sideOf(c.p[2]) === who && ((c.v[1] < 0 && c.p[1] < 1.0) || sign * c.p[2] > COURT.halfLength + 1.2),
      5,
    );
    if (!hit) return null;
    return { who, p: hit.p, t: this.t + hit.t };
  }

  private rallyTick(h: number, input: Input, ev: GameEvent[]): void {
    this.movePlayer(h, input.steer);
    this.moveCpu(h);
    const ex = this.expect;
    for (const sw of input.swings) {
      if (!ex || ex.who !== 'player' || this.pending) continue;
      const offset = sw.t - ex.t;
      if (Math.abs(offset) > WINDOW) {
        ev.push({ type: 'whiff', timing: offset < 0 ? 'früh' : 'spät' });
        continue;
      }
      this.pending = { swing: sw, offset };
    }
    if (ex && this.t >= ex.t) {
      if (ex.who === 'player' && this.pending) {
        if (Math.abs(ex.p[0] - this.player.x) <= REACH) {
          this.playerHit(this.pending.swing, this.pending.offset, ev);
          return;
        }
        this.pending = null;
        ev.push({ type: 'whiff', timing: 'weit' });
      }
      if (ex.who === 'cpu' && Math.abs(this.cpu.x - ex.p[0]) <= CPU[this.difficulty].reach) {
        this.strike('cpu', cpuShot(this.rng, CPU[this.difficulty], this.player.x), false, ev, { speedKmh: 0, kind: this.ball.p[0] < this.cpu.x ? 'forehand' : 'backhand' });
        const hit = ev[ev.length - 1];
        if (hit?.type === 'hit') hit.speedKmh = Math.round(Math.hypot(this.ball.v[0], this.ball.v[1], this.ball.v[2]) * 3.6);
        return;
      }
      if (this.t > ex.t + WINDOW) this.expect = null; // missed: the ball runs on
    }
    this.flyBall(h, ev, true);
  }

  private playerHit(sw: GameSwing, offset: number, ev: GameEvent[]): void {
    const u = Math.max(-1, Math.min(1, offset / WINDOW)); // -1 early .. +1 late
    const timing: Timing = Math.abs(u) < 0.3 ? 'perfekt' : u < 0 ? 'früh' : 'spät';
    const dir = sw.side === 'forehand' ? 1 : -1; // early forehand pulls cross (left)
    let x = dir * u * 3.6 + (this.rng() - 0.5) * 0.4;
    const power = Math.max(0, Math.min(1, (sw.speedKmh - 60) / 100));
    let z = -(7.6 + 3.0 * power);
    let spin = 150 + 150 * power;
    let speed = (sw.speedKmh / 3.6) * 0.8;
    if (sw.kind === 'slice') {
      spin = -130;
      speed *= 0.8;
      z = -9.0;
    }
    if (Math.abs(u) > 0.8) x = Math.sign(x || dir) * (COURT.singlesHalfWidth + 0.6); // edge of the window: out wide
    if (sw.speedKmh > 150 && sw.kind !== 'slice') z = -COURT.halfLength - 0.6; // overhit: long
    speed = Math.max(10, Math.min(38, speed));
    this.lastShot = { speedKmh: sw.speedKmh, kind: sw.kind, timing };
    this.strike('player', { target: [x, z], speed, spin }, false, ev, { speedKmh: sw.speedKmh, kind: sw.kind, timing });
  }

  private movePlayer(h: number, steer: number): void {
    const ex = this.expect?.who === 'player' ? this.expect : null;
    const tx = ex ? ex.p[0] - 0.5 : 0;
    const tz = ex ? Math.max(6, Math.min(COURT.halfLength + 2, ex.p[2])) : BASE_Z;
    const dx = Math.max(-RUN * h, Math.min(RUN * h, tx - this.player.x)) + steer * STEER * h;
    const dz = Math.max(-RUN * h, Math.min(RUN * h, tz - this.player.z));
    this.player = { x: Math.max(-7, Math.min(7, this.player.x + dx)), z: this.player.z + dz };
  }

  private moveCpu(h: number): void {
    const p = CPU[this.difficulty];
    if (this.t < this.cpuStart) return;
    const ex = this.expect?.who === 'cpu' ? this.expect : null;
    const tx = ex ? ex.p[0] + 0.4 : 0;
    const tz = ex ? Math.min(-6, Math.max(-COURT.halfLength - 2, ex.p[2])) : -BASE_Z;
    const s = p.speed * h;
    this.cpu = {
      x: this.cpu.x + Math.max(-s, Math.min(s, tx - this.cpu.x)),
      z: this.cpu.z + Math.max(-s, Math.min(s, tz - this.cpu.z)),
    };
  }

  /** Moves the ball; with judge=true applies the rules on bounces. */
  private flyBall(h: number, ev: GameEvent[], judge: boolean): void {
    for (const e of step(this.ball, h)) {
      if (e.type === 'net') {
        ev.push({ type: 'net' });
        continue;
      }
      ev.push({ type: 'bounce', p: e.p });
      if (!judge || !this.lastHitter) continue;
      this.bounces++;
      const hitter = this.lastHitter;
      const side = sideOf(e.p[2]);
      if (this.bounces === 1) {
        if (this.inServe) {
          if (side === hitter || !inServiceBox(e.p[0], e.p[2], other(hitter), this.score.deuceCourt())) {
            this.fault(ev, side === hitter ? 'Netz' : 'Fehler');
            return;
          }
          this.faults = 0;
          this.inServe = false;
        } else if (side === hitter) {
          this.endPoint(other(hitter), 'Netz', ev);
          return;
        } else if (!inSingles(e.p[0], e.p[2])) {
          this.endPoint(other(hitter), 'Aus', ev);
          return;
        }
      } else {
        this.endPoint(hitter, hitter === 'player' ? 'Gewinnschlag' : 'Verpasst', ev);
        return;
      }
    }
    if (judge && this.lastHitter && (Math.abs(this.ball.p[2]) > 22 || Math.abs(this.ball.p[0]) > 14 || this.t - this.hitT > 6)) {
      this.endPoint(this.bounces === 0 ? other(this.lastHitter) : this.lastHitter, this.bounces === 0 ? 'Aus' : 'Punkt', ev);
    }
  }

  private fault(ev: GameEvent[], reason: string): void {
    this.faults++;
    const double = this.faults >= 2;
    ev.push({ type: 'fault', double });
    if (double) {
      this.faults = 0;
      this.endPoint(other(this.server), 'Doppelfehler', ev);
      return;
    }
    this.message = reason === 'Netz' ? 'Netz – zweiter Aufschlag' : 'Fehler – zweiter Aufschlag';
    this.lastHitter = null;
    this.phase = 'point';
    this.phaseT = this.t - POINT_PAUSE + 1.0; // short pause, same point
  }

  private endPoint(winner: Who, reason: string, ev: GameEvent[]): void {
    this.faults = 0;
    this.lastHitter = null;
    this.expect = null;
    this.pending = null;
    const r = scorePoint(this.score, winner);
    this.score = r.score;
    ev.push({ type: 'point', winner, reason });
    if (r.event !== 'point') ev.push({ type: r.event, winner });
    this.message = `${reason}: ${winner === 'player' ? 'Punkt für dich' : 'Punkt für CPU'}`;
    this.phase = r.event === 'match' ? 'over' : 'point';
    if (r.event === 'match') this.message = winner === 'player' ? 'Match gewonnen!' : 'Match verloren';
    this.phaseT = this.t;
  }
}

/** Perfect-timing swings for the attract mode ("?demo=1") and tests. */
export class Autopilot {
  private served = -1;
  private answered: Expect | null = null;
  private readonly rng: Rng;

  constructor(seed = 7) {
    this.rng = mulberry32(seed);
  }

  /** Swings to feed into the next update(dt) call. */
  swings(g: Game, dt: number): GameSwing[] {
    const speedKmh = Math.round(95 + this.rng() * 40);
    if (g.phase === 'serve' && g.server === 'player' && g.tossAge >= 0.6 - dt && this.served !== g.tossAge - g.t) {
      this.served = g.tossAge - g.t;
      return [{ t: g.t - g.tossAge + 0.6, speedKmh, side: 'forehand', kind: 'forehand' }];
    }
    const ex = g.expect;
    if (g.phase === 'rally' && ex?.who === 'player' && ex !== this.answered && g.t + dt >= ex.t - 0.1) {
      this.answered = ex;
      const side: Side = ex.p[0] >= g.player.x ? 'forehand' : 'backhand';
      return [{ t: ex.t + (this.rng() - 0.5) * 0.44, speedKmh, side, kind: this.rng() < 0.15 ? 'slice' : side }];
    }
    return [];
  }
}
