import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newScore, pointLabel, scorePoint, servingSide, type Score } from '../src/tennis/core/scoring.ts';

const win = (s: Score, ...who: ('player' | 'cpu')[]) => who.reduce((acc, w) => scorePoint(acc, w).score, s);
const game = (s: Score, w: 'player' | 'cpu') => win(s, w, w, w, w);

test('points count 0/15/30/40 and a game needs four points', () => {
  let s = newScore();
  assert.equal(pointLabel(s), '0 : 0');
  s = win(s, 'player');
  assert.equal(pointLabel(s), '15 : 0');
  s = win(s, 'cpu', 'player');
  assert.equal(pointLabel(s), '30 : 15');
  s = win(s, 'player');
  assert.equal(pointLabel(s), '40 : 15');
  const r = scorePoint(s, 'player');
  assert.deepEqual(r.score.games, [1, 0]);
  assert.equal(r.event, 'game');
});

test('deuce and advantage', () => {
  let s = win(newScore(), 'player', 'player', 'player', 'cpu', 'cpu', 'cpu');
  assert.equal(pointLabel(s), 'Einstand');
  s = win(s, 'cpu');
  assert.equal(pointLabel(s), 'Vorteil CPU');
  s = win(s, 'player');
  assert.equal(pointLabel(s), 'Einstand');
  s = win(s, 'player');
  assert.equal(pointLabel(s), 'Vorteil Du');
  s = win(s, 'player');
  assert.deepEqual(s.games, [1, 0]);
  assert.equal(pointLabel(s), '0 : 0');
});

test('the server alternates every game', () => {
  let s = newScore('player');
  assert.equal(servingSide(s), 'player');
  s = game(s, 'cpu');
  assert.equal(servingSide(s), 'cpu');
  s = game(s, 'cpu');
  assert.equal(servingSide(s), 'player');
});

test('a set is 6 games with two ahead, then a tiebreak at 6:6 decides the match', () => {
  let s = newScore();
  for (let i = 0; i < 5; i++) s = game(game(s, 'player'), 'cpu');
  assert.deepEqual(s.games, [5, 5]);
  s = game(s, 'player');
  assert.equal(s.winner, null);
  s = game(s, 'cpu');
  assert.deepEqual(s.games, [6, 6]);
  assert.equal(s.tiebreak, true);
  s = win(s, 'player', 'player', 'player', 'player', 'player', 'cpu');
  assert.equal(pointLabel(s), '5 : 1');
  s = win(s, 'player');
  const r = scorePoint(s, 'player');
  assert.equal(r.event, 'match');
  assert.equal(r.score.winner, 'player');
  assert.deepEqual(r.score.sets, [1, 0]);
});

test('6:4 wins the set and with setsToWin 1 the match', () => {
  let s = newScore();
  for (let i = 0; i < 4; i++) s = game(game(s, 'player'), 'cpu');
  s = game(s, 'player');
  const last = win(s, 'player', 'player', 'player');
  const r = scorePoint(last, 'player');
  assert.equal(r.event, 'match');
  assert.deepEqual(r.score.games, [6, 4]);
});

test('tiebreak service: first point one server, then two each', () => {
  let s = newScore('player');
  for (let i = 0; i < 6; i++) s = game(game(s, 'player'), 'cpu');
  assert.equal(s.tiebreak, true);
  const first = servingSide(s);
  const seq = [first];
  for (let i = 0; i < 4; i++) {
    s = win(s, i % 2 ? 'player' : 'cpu');
    seq.push(servingSide(s));
  }
  assert.equal(seq[1], seq[2]);
  assert.notEqual(seq[0], seq[1]);
  assert.notEqual(seq[2], seq[3]);
  assert.equal(seq[3], seq[4]);
});

test('deuce court alternates with the points', () => {
  let s = newScore();
  assert.equal(s.deuceCourt(), true);
  s = win(s, 'player');
  assert.equal(s.deuceCourt(), false);
});
