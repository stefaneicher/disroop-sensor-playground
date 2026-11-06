import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeColor, rgbToHex, hexToRgb } from '../static/js/color.js';

test('normalizeColor divides RGB by clear and scales to 0..255', () => {
  assert.deepEqual(normalizeColor({ r: 180, g: 160, b: 120, clear: 400 }), { r: 115, g: 102, b: 77 });
});

test('normalizeColor clamps to 255', () => {
  assert.deepEqual(normalizeColor({ r: 500, g: 100, b: 0, clear: 400 }), { r: 255, g: 64, b: 0 });
});

test('normalizeColor falls back to the brightest channel when clear is 0', () => {
  assert.deepEqual(normalizeColor({ r: 10, g: 5, b: 0, clear: 0 }), { r: 255, g: 128, b: 0 });
  assert.deepEqual(normalizeColor({ r: 0, g: 0, b: 0, clear: 0 }), { r: 0, g: 0, b: 0 });
});

test('normalizeColor returns null for missing data', () => {
  assert.equal(normalizeColor(null), null);
  assert.equal(normalizeColor({ r: null, g: 1, b: 1, clear: 1 }), null);
});

test('rgbToHex and hexToRgb round-trip', () => {
  assert.equal(rgbToHex({ r: 255, g: 0, b: 128 }), '#ff0080');
  assert.deepEqual(hexToRgb('#ff0080'), { r: 255, g: 0, b: 128 });
  assert.equal(rgbToHex(null), null);
  assert.equal(hexToRgb('nope'), null);
});
