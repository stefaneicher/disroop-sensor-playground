import { DASH, isNum } from './format.ts';
import type { Sound } from './telemetry.ts';

// Mirrors hardware/shared/chorus.json (verified by test/chorus.test.ts); the bridge does not serve it.
export const CHORUS_HZ: readonly number[] = [
  440, 440, 440, 523, 440, 392, 440,
  440, 440, 523, 440, 392, 440,
  587, 523, 494, 440,
  440, 440, 440, 523, 440, 392, 440,
];

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function noteName(hz: unknown): string {
  if (!isNum(hz) || hz <= 0) return DASH;
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export interface SongProgress { index: number; total: number; note: string; percent: number }

export function songProgress(song: Sound['song'] | null | undefined): SongProgress {
  const total = CHORUS_HZ.length;
  const i = song?.note_index;
  const index = song?.playing && isNum(i) && i >= 0 && i < total ? i : -1;
  if (index < 0) return { index: -1, total, note: DASH, percent: 0 };
  return { index, total, note: noteName(CHORUS_HZ[index]), percent: ((index + 1) / total) * 100 };
}
