/** HUD and menu DOM updates (German texts). */
import type { Game, GameEvent, Timing } from './core/game.ts';
import { pointLabel } from './core/scoring.ts';
import type { Stroke } from '../input/swing.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

export const STROKE: Record<Stroke, string> = { forehand: 'Vorhand', backhand: 'Rückhand', slice: 'Slice' };
const TIMING: Record<Timing | 'weit', string> = { früh: 'zu früh', perfekt: 'perfekt', spät: 'zu spät', weit: 'zu weit weg' };

export type Badge = 'live' | 'sim' | 'off';

export class Hud {
  private readonly el = {
    sets: $('sc-sets'),
    games: $('sc-games'),
    points: $('sc-points'),
    serve: $('sc-serve'),
    badge: $('badge'),
    cam: $('cam-label'),
    kmh: $('sw-kmh'),
    bar: $('sw-bar'),
    kind: $('sw-kind'),
    timing: $('sw-timing'),
    roll: $('sw-roll'),
    msg: $('msg'),
    hint: $('hint'),
  };
  private flash = '';
  private flashUntil = 0;
  private cache = new Map<HTMLElement, string>();

  private set(el: HTMLElement, text: string): void {
    if (this.cache.get(el) === text) return;
    this.cache.set(el, text);
    el.textContent = text;
  }

  /** A short message that overrides the game message for `ms`. */
  say(text: string, now: number, ms = 1400): void {
    this.flash = text;
    this.flashUntil = now + ms;
  }

  badge(b: Badge): void {
    const text = b === 'live' ? 'LIVE' : b === 'sim' ? 'SIM' : 'TASTATUR';
    if (this.cache.get(this.el.badge) === text) return;
    this.set(this.el.badge, text);
    this.el.badge.className = `badge ${b}`;
  }

  camera(label: string): void {
    this.set(this.el.cam, label);
  }

  hint(text: string): void {
    this.set(this.el.hint, text);
  }

  roll(deg: number | null): void {
    this.set(this.el.roll, deg === null ? '–' : `${deg >= 0 ? '+' : '−'}${Math.abs(deg).toFixed(0)}°`);
  }

  event(e: GameEvent, now: number): void {
    if (e.type === 'whiff') this.say(`Daneben – ${TIMING[e.timing]}`, now, 900);
    if (e.type === 'hit' && e.who === 'player') {
      this.set(this.el.kmh, `${e.speedKmh} km/h`);
      this.el.bar.style.width = `${Math.max(5, Math.min(100, ((e.speedKmh - 40) / 140) * 100))}%`;
      this.set(this.el.kind, `${STROKE[e.kind]}${e.serve ? ' (Aufschlag)' : ''}`);
      this.set(this.el.timing, e.timing ? TIMING[e.timing] : '–');
    }
    if (e.type === 'game') this.say(e.winner === 'player' ? 'Spiel gewonnen!' : 'Spiel CPU', now, 1800);
    if (e.type === 'set') this.say(e.winner === 'player' ? 'Satz gewonnen!' : 'Satz CPU', now, 2200);
  }

  update(g: Game, now: number, idle: string): void {
    const s = g.score;
    this.set(this.el.sets, `${s.sets[0]} : ${s.sets[1]}`);
    this.set(this.el.games, `${s.games[0]} : ${s.games[1]}`);
    this.set(this.el.points, s.tiebreak ? `TB ${pointLabel(s)}` : pointLabel(s));
    this.set(this.el.serve, g.server === 'player' ? 'Du' : 'CPU');
    let msg = g.message && (g.phase === 'point' || g.phase === 'over') ? g.message : '';
    if (!msg && g.phase === 'serve') msg = g.server === 'player' ? 'Dein Aufschlag – schwingen, wenn der Ball oben ist' : 'Aufschlag CPU';
    if (now < this.flashUntil) msg = this.flash;
    this.set(this.el.msg, msg || idle);
  }
}
