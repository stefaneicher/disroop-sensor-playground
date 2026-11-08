// Barometric altimeter: international barometric formula, a calibratable sea-level reference and smoothing.
export const STANDARD_HPA = 1013.25;
const SCALE_M = 44330;
const EXPONENT = 5.255;

export type CalibrationMode = 'standard' | 'known' | 'zero';
export interface Calibration { readonly mode: CalibrationMode; readonly refHpa: number; readonly label: string }

export const STANDARD: Calibration = { mode: 'standard', refHpa: STANDARD_HPA, label: 'Standard-Atmosphäre (1013.25 hPa)' };

const valid = (p: unknown): p is number => typeof p === 'number' && Number.isFinite(p) && p > 300 && p < 1100;

/** Height in metres above the level where the pressure equals refHpa. */
export function altitudeM(pressureHpa: number, refHpa: number): number {
  return SCALE_M * (1 - Math.pow(pressureHpa / refHpa, 1 / EXPONENT));
}

/** Sea-level pressure (QNH) that makes the current pressure read the known altitude. */
export function seaLevelHpa(pressureHpa: number, knownAltitudeM: number): number {
  return pressureHpa / Math.pow(1 - knownAltitudeM / SCALE_M, EXPONENT);
}

export function calibrateKnown(pressureHpa: unknown, knownAltitudeM: unknown): Calibration | null {
  if (!valid(pressureHpa) || typeof knownAltitudeM !== 'number' || !Number.isFinite(knownAltitudeM)
    || knownAltitudeM < -400 || knownAltitudeM > 9000) return null;
  const refHpa = seaLevelHpa(pressureHpa, knownAltitudeM);
  return { mode: 'known', refHpa, label: `Meereshöhe-Druck ${refHpa.toFixed(1)} hPa (bei ${Math.round(knownAltitudeM)} m kalibriert)` };
}

export function calibrateZero(pressureHpa: unknown): Calibration | null {
  return valid(pressureHpa) ? { mode: 'zero', refHpa: pressureHpa, label: 'relativ zu deinem Nullpunkt' } : null;
}

/** Exponential smoothing so the reading does not jitter with sensor noise. */
export function smoothPressure(previous: number | null, sample: number, alpha = 0.2): number {
  return previous === null ? sample : previous + alpha * (sample - previous);
}

export function parseCalibration(raw: string | null): Calibration {
  try {
    const c = JSON.parse(raw ?? 'null') as { mode?: string; refHpa?: unknown; label?: unknown } | null;
    if (c && (c.mode === 'known' || c.mode === 'zero') && valid(c.refHpa) && typeof c.label === 'string') {
      return { mode: c.mode, refHpa: c.refHpa, label: c.label };
    }
  } catch { /* fall through to the default */ }
  return STANDARD;
}
