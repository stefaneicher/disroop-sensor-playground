import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Autopilot, Game, type GameEvent, type GameSwing, type Input } from '../src/core/game.ts';
import { inSingles } from '../src/core/court.ts';

const FRAME = 1 / 60;
const idle: Input = { steer: 0, swings: [], serve: false };

function run(g: Game, seconds: number, until?: (e: GameEvent[], g: Game) => boolean, input: (g: Game) => Input = () => idle): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += FRAME) {
    const ev = g.update(FRAME, input(g));
    all.push(...ev);
    if (until?.(ev, g)) break;
  }
  return all;
}

/** Plays until the cpu ball is on its way to the player with a predicted hit point. */
function untilPlayerBall(g: Game): void {
  run(g, 30, (_, gg) => gg.phase === 'rally' && gg.expect?.who === 'player' && gg.t < gg.expect.t - 0.3);
  assert.equal(g.expect?.who, 'player', 'cpu ball expected');
}

const swingAt = (t: number, extra: Partial<GameSwing> = {}): GameSwing => ({ t, speedKmh: 110, side: 'forehand', kind: 'forehand', ...extra });

test('the player serves automatically tossed balls with a timed swing into the box', () => {
  const g = new Game({ firstServer: 'player', seed: 1 });
  run(g, 3, (e) => e.some((x) => x.type === 'toss'));
  assert.ok(g.tossAge >= 0);
  const toss = g.t - g.tossAge;
  const ev = run(g, 4, (e) => e.some((x) => x.type === 'bounce'), (gg) => ({ ...idle, swings: gg.t < toss + 0.6 && gg.t + FRAME >= toss + 0.6 ? [swingAt(toss + 0.6)] : [] }));
  assert.ok(ev.some((e) => e.type === 'hit' && e.who === 'player' && e.serve));
  assert.ok(!ev.some((e) => e.type === 'fault'), JSON.stringify(ev.filter((e) => e.type !== 'bounce')));
  assert.equal(g.lastShot?.timing, 'perfekt');
});

test('two badly timed serves are a double fault', () => {
  const g = new Game({ firstServer: 'player', seed: 1 });
  const ev = run(g, 12, (e) => e.some((x) => x.type === 'point'), (gg) => {
    const age = gg.tossAge;
    return { ...idle, swings: age >= 0.32 && age < 0.32 + FRAME ? [swingAt(gg.t)] : [] };
  });
  const faults = ev.filter((e) => e.type === 'fault');
  assert.equal(faults.length, 2);
  assert.deepEqual(faults.map((f) => f.type === 'fault' && f.double), [false, true]);
  assert.ok(ev.some((e) => e.type === 'point' && e.winner === 'cpu' && e.reason === 'Doppelfehler'));
  assert.deepEqual(g.score.points, [0, 1]);
});

test('a ball the player does not swing at is the cpu point', () => {
  const g = new Game({ firstServer: 'cpu', seed: 3, difficulty: 'schwer' });
  untilPlayerBall(g);
  const ev = run(g, 6, (e) => e.some((x) => x.type === 'point'));
  const p = ev.find((e) => e.type === 'point');
  assert.ok(p && p.type === 'point' && p.winner === 'cpu', JSON.stringify(p));
});

test('a timed swing returns the ball; timing picks the direction', () => {
  const landing = (offset: number, side: 'forehand' | 'backhand') => {
    const g = new Game({ firstServer: 'cpu', seed: 3, difficulty: 'schwer' });
    untilPlayerBall(g);
    const t = g.expect!.t + offset;
    let sent = false;
    const ev = run(g, 5, (e, gg) => e.some((x) => x.type === 'bounce' && x.p[2] < 0) || gg.phase !== 'rally', () => {
      if (sent) return idle;
      sent = true;
      return { ...idle, swings: [swingAt(t, { side, kind: side })] };
    });
    const hit = ev.find((e) => e.type === 'hit' && e.who === 'player');
    assert.ok(hit, `no hit: ${JSON.stringify(ev.filter((e) => e.type !== 'bounce'))}`);
    const b = ev.find((e) => e.type === 'bounce' && e.p[2] < 0);
    assert.ok(b && b.type === 'bounce');
    return b.p;
  };
  const early = landing(-0.15, 'forehand');
  const centre = landing(0, 'forehand');
  const late = landing(0.15, 'forehand');
  assert.ok(early[0] < centre[0] - 1 && late[0] > centre[0] + 1, `${early[0]} ${centre[0]} ${late[0]}`);
  assert.ok(inSingles(centre[0], centre[2]));
  const bhEarly = landing(-0.15, 'backhand');
  assert.ok(bhEarly[0] > centre[0] + 1, 'backhand mirrored');
});

test('a swing outside the window is a whiff', () => {
  const g = new Game({ firstServer: 'cpu', seed: 3 });
  untilPlayerBall(g);
  const ev = g.update(FRAME, { ...idle, swings: [swingAt(g.expect!.t - 0.6)] });
  assert.ok(ev.some((e) => e.type === 'whiff' && e.timing === 'früh'));
});

test('tilt steering moves the player sideways on top of the auto-run', () => {
  const a = new Game({ seed: 9 });
  const b = new Game({ seed: 9 });
  run(a, 3, undefined, () => ({ ...idle, steer: 1 }));
  run(b, 3);
  assert.ok(a.player.x > b.player.x + 0.5 || a.phase !== 'rally');
});

test('autopilot against the cpu plays a whole match deterministically', () => {
  const play = () => {
    const g = new Game({ seed: 11, difficulty: 'mittel', gamesPerSet: 2 });
    const ap = new Autopilot(5);
    const ev = run(g, 60 * 60, (_, gg) => gg.phase === 'over', (gg) => ({ ...idle, swings: ap.swings(gg, FRAME) }));
    return { g, ev };
  };
  const { g, ev } = play();
  assert.equal(g.phase, 'over');
  assert.ok(g.score.winner);
  const hits = ev.filter((e) => e.type === 'hit');
  assert.ok(hits.filter((h) => h.type === 'hit' && h.who === 'player' && !h.serve).length > 5, 'rallies happen');
  const again = play();
  assert.deepEqual(again.g.score.sets, g.score.sets);
  assert.equal(again.ev.length, ev.length);
});
