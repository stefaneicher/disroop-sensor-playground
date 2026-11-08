import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHORUS_HZ, noteName, songProgress } from '../src/chorus.ts';

const chorus = JSON.parse(readFileSync(new URL('../../../shared/chorus.json', import.meta.url), 'utf8'));

test('CHORUS_HZ mirrors hardware/shared/chorus.json', () => {
  assert.deepEqual(CHORUS_HZ, chorus.notes.map((n: { hz: number }) => n.hz));
  assert.equal(CHORUS_HZ.length, 24);
});

test('noteName maps frequencies to scientific pitch', () => {
  assert.equal(noteName(440), 'A4');
  assert.equal(noteName(523), 'C5');
  assert.equal(noteName(392), 'G4');
  assert.equal(noteName(587), 'D5');
  assert.equal(noteName(494), 'B4');
  assert.equal(noteName(null), '–');
});

test('songProgress describes the current note', () => {
  assert.deepEqual(songProgress({ playing: true, note_index: 3 }), { index: 3, total: 24, note: 'C5', percent: (4 / 24) * 100 });
  assert.deepEqual(songProgress({ playing: false, note_index: -1 }), { index: -1, total: 24, note: '–', percent: 0 });
  assert.deepEqual(songProgress(null), { index: -1, total: 24, note: '–', percent: 0 });
});
