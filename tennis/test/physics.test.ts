import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURT, inServiceBox, inSingles } from '../src/core/court.ts';
import { DT, launch, predict, simulate, step, type Ball } from '../src/core/physics.ts';

const ball = (p: [number, number, number], v: [number, number, number], spin = 0): Ball => ({ p, v, spin });

test('a dropped ball falls with g, bounces lower and reports the bounce', () => {
  const b = ball([0, 2, 5], [0, 0, 0]);
  const events = [];
  let t = 0;
  for (; t < 1.5; t += DT) events.push(...step(b, DT));
  const bounces = events.filter((e) => e.type === 'bounce');
  assert.ok(bounces.length >= 1);
  const first = bounces[0]!;
  assert.ok(Math.abs(first.p[0]) < 1e-9 && Math.abs(first.p[2] - 5) < 1e-9);
  // fell ~0.64 s (2 m with a little drag)
  let max = 0;
  const b2 = ball([0, 2, 5], [0, 0, 0]);
  let after = false;
  for (let i = 0; i < 400; i++) {
    if (step(b2, DT).some((e) => e.type === 'bounce')) after = true;
    if (after) max = Math.max(max, b2.p[1]);
  }
  assert.ok(max < 1.4 && max > 0.7, `rebound ${max}`);
});

test('drag slows a fast ball', () => {
  const b = ball([0, 10, 0], [30, 0, 0]);
  for (let i = 0; i < 120; i++) step(b, DT);
  assert.ok(b.v[0] < 27 && b.v[0] > 20, `vx ${b.v[0]}`);
});

test('topspin dips the ball (lands shorter), backspin floats it', () => {
  const land = (spin: number) => predict(ball([0, 1, 11], [0, 4, -25], spin), (e) => e.type === 'bounce')!.p[2];
  const flat = land(0);
  assert.ok(land(250) > flat + 0.5, 'topspin shorter');
  assert.ok(land(-150) < flat - 0.3, 'slice longer');
});

test('a low ball hits the net and drops on the hitter side', () => {
  const b = ball([0, 0.5, 6], [0, 0, -20]);
  const ev = simulate(b, 2);
  assert.ok(ev.some((e) => e.type === 'net'));
  assert.ok(b.p[2] > 0);
});

test('launch solves a shot that clears the net and lands on the target', () => {
  for (const [tx, tz, speed, spin] of [[-3, -9, 25, 200], [2.5, -10, 32, 300], [0, -7, 18, -120], [3, 9, 22, 150]] as const) {
    const from: [number, number, number] = [0.5, 1, tz < 0 ? 11 : -11];
    const b = launch(from, [tx, tz], speed, spin);
    const bounce = predict(b, (e) => e.type === 'bounce' || e.type === 'net');
    assert.equal(bounce?.type, 'bounce', `net for ${tx},${tz}`);
    assert.ok(Math.hypot(bounce!.p[0] - tx, bounce!.p[2] - tz) < 0.25, `landed ${bounce!.p} for ${tx},${tz}`);
  }
});

test('court helpers: singles bounds and service boxes', () => {
  assert.ok(inSingles(4.1, -11.8));
  assert.ok(!inSingles(4.3, -5));
  assert.ok(!inSingles(0, -12.1));
  assert.ok(inServiceBox(-2, -4, 'cpu', true));
  assert.ok(!inServiceBox(2, -4, 'cpu', true));
  assert.ok(inServiceBox(2, -4, 'cpu', false));
  assert.ok(!inServiceBox(-2, -7, 'cpu', true));
  assert.ok(inServiceBox(2, 4, 'player', true));
  assert.ok(COURT.netHeight > 0.9);
});
