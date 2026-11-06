import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DASH, fmt, fmtSigned, orientationLabel, tapArrow, cardinal, clock } from '../static/js/format.js';

test('fmt renders numbers with fixed digits and unit', () => {
  assert.equal(fmt(23.456, 1, '°C'), '23.5 °C');
  assert.equal(fmt(41, 0, '%'), '41 %');
  assert.equal(fmt(963.2, 1), '963.2');
});

test('fmt renders a dash for missing values', () => {
  for (const v of [null, undefined, NaN, Infinity, 'x']) assert.equal(fmt(v, 1, '°C'), DASH);
});

test('fmtSigned prefixes positive numbers with +', () => {
  assert.equal(fmtSigned(1.234, 2), '+1.23');
  assert.equal(fmtSigned(-0.4, 1), '−0.4');
  assert.equal(fmtSigned(0, 1), '0.0');
  assert.equal(fmtSigned(null, 1), DASH);
});

test('orientationLabel translates to German', () => {
  assert.equal(orientationLabel('portrait'), 'Hochformat');
  assert.equal(orientationLabel('landscape'), 'Querformat');
  assert.equal(orientationLabel('reverse_portrait'), 'Hochformat, umgekehrt');
  assert.equal(orientationLabel('reverse_landscape'), 'Querformat, umgekehrt');
  assert.equal(orientationLabel(null), DASH);
});

test('tapArrow maps tap directions to arrows', () => {
  assert.equal(tapArrow('X+'), '→');
  assert.equal(tapArrow('X-'), '←');
  assert.equal(tapArrow('Y+'), '↑');
  assert.equal(tapArrow('Y-'), '↓');
  assert.equal(tapArrow('Z+'), '⊙');
  assert.equal(tapArrow('Z-'), '⊗');
  assert.equal(tapArrow(undefined), DASH);
});

test('cardinal maps headings to German 8-point compass directions', () => {
  assert.equal(cardinal(0), 'N');
  assert.equal(cardinal(47), 'NO');
  assert.equal(cardinal(90), 'O');
  assert.equal(cardinal(135), 'SO');
  assert.equal(cardinal(180), 'S');
  assert.equal(cardinal(225), 'SW');
  assert.equal(cardinal(270), 'W');
  assert.equal(cardinal(337.6), 'N');
  assert.equal(cardinal(-90), 'W');
  assert.equal(cardinal(null), DASH);
});

test('clock formats a timestamp as HH:MM:SS', () => {
  assert.equal(clock(new Date(2026, 0, 1, 9, 5, 7).getTime()), '09:05:07');
});
