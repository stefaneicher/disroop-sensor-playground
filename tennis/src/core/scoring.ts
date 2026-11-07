/** Tennis scoring: 15/30/40, Einstand/Vorteil, games, sets (6, two ahead), tiebreak at 6:6. */
import { other, type Who } from './court.ts';

export interface Rules {
  gamesPerSet: number;
  setsToWin: number;
}

export interface Score {
  rules: Rules;
  points: [number, number]; // [player, cpu]
  games: [number, number];
  sets: [number, number];
  tiebreak: boolean;
  firstServer: Who; // server of the first game
  gamesPlayed: number;
  winner: Who | null;
  /** true if the next serve is from the deuce (right) court. */
  deuceCourt(): boolean;
}

export type ScoreEvent = 'point' | 'game' | 'set' | 'match';

const idx = (w: Who): 0 | 1 => (w === 'player' ? 0 : 1);

function make(s: Omit<Score, 'deuceCourt'>): Score {
  return { ...s, deuceCourt: () => (s.points[0] + s.points[1]) % 2 === 0 };
}

export function newScore(firstServer: Who = 'player', rules: Rules = { gamesPerSet: 6, setsToWin: 1 }): Score {
  return make({ rules, points: [0, 0], games: [0, 0], sets: [0, 0], tiebreak: false, firstServer, gamesPlayed: 0, winner: null });
}

export function servingSide(s: Score): Who {
  const gameServer = s.gamesPlayed % 2 === 0 ? s.firstServer : other(s.firstServer);
  if (!s.tiebreak) return gameServer;
  const n = s.points[0] + s.points[1];
  return Math.floor((n + 1) / 2) % 2 === 0 ? gameServer : other(gameServer);
}

export function scorePoint(s: Score, w: Who): { score: Score; event: ScoreEvent } {
  if (s.winner) return { score: s, event: 'match' };
  const i = idx(w);
  const points: [number, number] = [...s.points];
  points[i]++;
  const mine = points[i];
  const theirs = points[1 - i]!;
  const need = s.tiebreak ? 7 : 4;
  if (mine < need || mine - theirs < 2) {
    return { score: make({ ...s, points }), event: 'point' };
  }
  const games: [number, number] = [...s.games];
  games[i]++;
  const g = games[i]!;
  const og = games[1 - i]!;
  const n = s.rules.gamesPerSet;
  const setWon = s.tiebreak || (g >= n && g - og >= 2);
  if (!setWon) {
    const tiebreak = g === n && og === n;
    return { score: make({ ...s, points: [0, 0], games, tiebreak, gamesPlayed: s.gamesPlayed + 1 }), event: 'game' };
  }
  const sets: [number, number] = [...s.sets];
  sets[i]++;
  const winner = sets[i]! >= s.rules.setsToWin ? w : null;
  const next = make({
    ...s,
    points: [0, 0],
    games: winner ? games : [0, 0],
    sets,
    tiebreak: false,
    gamesPlayed: s.gamesPlayed + 1,
    winner,
  });
  return { score: next, event: winner ? 'match' : 'set' };
}

const NAMES = ['0', '15', '30', '40'];

export function pointLabel(s: Score): string {
  const [p, c] = s.points;
  if (s.tiebreak) return `${p} : ${c}`;
  if (p >= 3 && c >= 3) {
    if (p === c) return 'Einstand';
    return p > c ? 'Vorteil Du' : 'Vorteil CPU';
  }
  return `${NAMES[p]} : ${NAMES[c]}`;
}
