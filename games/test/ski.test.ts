import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from '../src/ski/courses.ts';
import { Track } from '../src/ski/track.ts';
import { autopilot, startSkier, stepSkier, type World } from '../src/ski/physics.ts';

function run(def: (typeof COURSES)[number], skill = 1) {
  const track = new Track(def);
  const w: World = { track, gates: track.gates() };
  const k = startSkier(track);
  const events: string[] = [];
  for (let i = 0; i < 60 * 400 && !k.finished; i++) {
    for (const e of stepSkier(w, k, autopilot(w, k, skill), 1 / 60)) events.push(e.type);
  }
  return { track, k, events };
}

for (const def of COURSES) {
  test(`${def.id}: lengths and drop match the official numbers`, () => {
    const t = new Track(def);
    const official = Number(/Länge (\d+) m/.exec(def.facts[0]!)![1]);
    assert.ok(Math.abs(t.length - t.def.runout - official) < 60, `${t.finish} vs ${official}`);
    const first = t.samples[0]!;
    const last = t.samples[t.samples.length - 1]!;
    assert.ok(Math.abs(first.y - last.y - def.drop) < 25, `drop ${first.y - last.y}`);
    for (const s of t.samples) assert.ok(Number.isFinite(s.x + s.y + s.z));
  });

  test(`${def.id}: a clean tuck run finishes near the record time`, () => {
    const { k, events } = run(def);
    assert.ok(k.finished, `finished at s=${k.s.toFixed(0)}, t=${k.t.toFixed(1)}`);
    const kmh = k.maxV * 3.6;
    console.log(def.id, 'time', k.t.toFixed(1), 'vmax', kmh.toFixed(0), 'crashes', k.crashes, 'gates', k.gatesHit, '/', k.gatesMissed, 'events', events.filter((e) => e === 'land').length);
    assert.ok(k.t > def.goldTime * 0.9 && k.t < def.goldTime * 1.35, `time ${k.t}`);
    assert.ok(kmh > 110 && kmh < 190, `vmax ${kmh}`);
  });
}
