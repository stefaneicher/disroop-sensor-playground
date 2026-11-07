// Rally statistics of the autopilot against each difficulty (balancing aid): node dev/stats.ts
import { Autopilot, Game } from '../src/core/game.ts';
import { DIFFICULTIES } from '../src/core/cpu.ts';

for (const d of DIFFICULTIES) {
  const reasons: Record<string, number> = {};
  let hits = 0;
  let points = 0;
  let won = 0;
  for (let seed = 1; seed <= 5; seed++) {
    const g = new Game({ seed, difficulty: d });
    const ap = new Autopilot(seed);
    for (let i = 0; i < 60 * 60 * 30 && g.phase !== 'over'; i++) {
      for (const e of g.update(1 / 60, { steer: 0, swings: ap.swings(g, 1 / 60), serve: false })) {
        if (e.type === 'hit' && !e.serve) hits++;
        if (e.type === 'point') {
          points++;
          const k = `${e.winner}:${e.reason}`;
          reasons[k] = (reasons[k] ?? 0) + 1;
        }
        if (e.type === 'match' && e.winner === 'player') won++;
      }
    }
  }
  console.log(d, { matchesWon: `${won}/5`, rallyHitsPerPoint: (hits / points).toFixed(2), reasons });
}
