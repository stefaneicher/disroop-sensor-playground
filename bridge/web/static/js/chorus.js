import { DASH, isNum } from './format.js';

// Mirrors shared/chorus.json (verified by test/chorus.test.js); the bridge does not serve it.
export const CHORUS_HZ = [
  440, 440, 440, 523, 440, 392, 440,
  440, 440, 523, 440, 392, 440,
  587, 523, 494, 440,
  440, 440, 440, 523, 440, 392, 440,
];

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function noteName(hz) {
  if (!isNum(hz) || hz <= 0) return DASH;
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function songProgress(song) {
  const total = CHORUS_HZ.length;
  const index = song?.playing && isNum(song.note_index) && song.note_index >= 0 && song.note_index < total
    ? song.note_index : -1;
  if (index < 0) return { index: -1, total, note: DASH, percent: 0 };
  return { index, total, note: noteName(CHORUS_HZ[index]), percent: ((index + 1) / total) * 100 };
}
