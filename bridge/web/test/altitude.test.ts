import { test } from 'node:test';
import assert from 'node:assert/strict';
import { altitudeM, seaLevelHpa, calibrateKnown, calibrateZero, smoothPressure, parseCalibration, STANDARD, STANDARD_HPA } from '../src/altitude.ts';

test('altitude is 0 at the reference pressure and ~110 m at 1000 hPa', () => {
  assert.equal(altitudeM(STANDARD_HPA, STANDARD_HPA), 0);
  assert.ok(Math.abs(altitudeM(1000, STANDARD_HPA) - 110.9) < 1);
});

test('about 8 m per hPa near sea level, decreasing pressure means rising', () => {
  const d = altitudeM(1012.25, 1013.25) - altitudeM(1013.25, 1013.25);
  assert.ok(d > 7.5 && d < 9);
});

test('calibrating with a known altitude reproduces it and round-trips', () => {
  const cal = calibrateKnown(950, 550);
  assert.ok(cal);
  assert.ok(Math.abs(altitudeM(950, cal.refHpa) - 550) < 1e-6);
  assert.ok(Math.abs(seaLevelHpa(950, 550) - cal.refHpa) < 1e-9);
  assert.ok(cal.refHpa > 1000 && cal.refHpa < 1030);
});

test('zero calibration reads 0 m here and negative m when pressure rises', () => {
  const cal = calibrateZero(960);
  assert.ok(cal);
  assert.equal(altitudeM(960, cal.refHpa), 0);
  assert.ok(altitudeM(961, cal.refHpa) < 0);
});

test('calibration rejects missing, implausible and non-finite input', () => {
  assert.equal(calibrateKnown(null, 100), null);
  assert.equal(calibrateKnown(950, NaN), null);
  assert.equal(calibrateKnown(950, 20000), null);
  assert.equal(calibrateKnown(5, 100), null);
  assert.equal(calibrateZero(undefined), null);
});

test('smoothing starts at the first sample and then moves a fraction towards new ones', () => {
  assert.equal(smoothPressure(null, 1000), 1000);
  assert.equal(smoothPressure(1000, 1010, 0.2), 1002);
});

test('parseCalibration restores a saved value and falls back to standard on garbage', () => {
  const saved = calibrateKnown(950, 550)!;
  assert.deepEqual(parseCalibration(JSON.stringify(saved)), saved);
  assert.equal(parseCalibration('nope'), STANDARD);
  assert.equal(parseCalibration(null), STANDARD);
  assert.equal(parseCalibration('{"mode":"known","refHpa":5,"label":"x"}'), STANDARD);
});
