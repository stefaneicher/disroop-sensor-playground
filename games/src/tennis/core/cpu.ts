/** CPU opponent: movement profile and shot choice per difficulty. */
import { COURT } from './court.ts';
import { between, type Rng } from './rng.ts';

export type Difficulty = 'leicht' | 'mittel' | 'schwer';
export const DIFFICULTIES: Difficulty[] = ['leicht', 'mittel', 'schwer'];

export interface CpuProfile {
  speed: number; // m/s running speed
  reaction: number; // s before it starts to run
  reach: number; // m lateral reach
  aimError: number; // m random landing error
  errorRate: number; // chance of an unforced error (out or net)
  pace: number; // m/s horizontal ball speed
  spread: number; // m how wide it aims from the centre
  serveFault: number; // chance of a service fault
}

export const CPU: Record<Difficulty, CpuProfile> = {
  leicht: { speed: 2.0, reaction: 0.5, reach: 0.9, aimError: 1.0, errorRate: 0.16, pace: 17, spread: 1.6, serveFault: 0.3 },
  mittel: { speed: 2.6, reaction: 0.45, reach: 1.0, aimError: 0.7, errorRate: 0.09, pace: 22, spread: 2.6, serveFault: 0.2 },
  schwer: { speed: 3.2, reaction: 0.3, reach: 1.2, aimError: 0.4, errorRate: 0.05, pace: 27, spread: 3.3, serveFault: 0.12 },
};

export interface ShotPlan {
  target: [number, number]; // landing x, z
  speed: number;
  spin: number;
}

/** A rally shot towards the player (+z). Aims away from the player, sometimes misses. */
export function cpuShot(r: Rng, p: CpuProfile, playerX: number): ShotPlan {
  const away = playerX > 0 ? -1 : 1;
  let x = away * between(r, 0.3, 1) * p.spread + between(r, -p.aimError, p.aimError);
  let z = between(r, 7.5, 10.8) + between(r, -p.aimError, p.aimError) * 0.6;
  if (r() < p.errorRate) {
    if (r() < 0.5) x = Math.sign(x || 1) * (COURT.singlesHalfWidth + between(r, 0.3, 1.2));
    else z = COURT.halfLength + between(r, 0.3, 1.5);
  }
  x = Math.max(-COURT.singlesHalfWidth - 1.5, Math.min(COURT.singlesHalfWidth + 1.5, x));
  return { target: [x, z], speed: p.pace * between(r, 0.9, 1.1), spin: between(r, 120, 260) };
}

/** A serve from the cpu into the player's box (+z). deuce: the player's right (+x) half. */
export function cpuServe(r: Rng, p: CpuProfile, deuce: boolean): ShotPlan {
  const sx = deuce ? 1 : -1;
  const x = sx * between(r, 0.6, 3.4);
  let z = between(r, 4.2, 6.0);
  if (r() < p.serveFault) z = COURT.serviceLine + between(r, 0.3, 1.2);
  return { target: [x, z], speed: p.pace * 1.35, spin: 80 };
}
