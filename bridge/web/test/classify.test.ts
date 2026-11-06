import { test } from 'node:test';
import assert from 'node:assert/strict';
import { co2Level, batteryLevel, rssiBars } from '../src/classify.ts';

test('co2Level uses traffic-light thresholds 800 / 1500 ppm', () => {
  assert.deepEqual(co2Level(612), { level: 'good', label: 'gut' });
  assert.equal(co2Level(799).level, 'good');
  assert.deepEqual(co2Level(800), { level: 'warn', label: 'mässig' });
  assert.equal(co2Level(1499).level, 'warn');
  assert.deepEqual(co2Level(1500), { level: 'bad', label: 'schlecht' });
  assert.deepEqual(co2Level(null), { level: 'none', label: '' });
});

test('batteryLevel classifies charge', () => {
  assert.equal(batteryLevel(87), 'good');
  assert.equal(batteryLevel(30), 'warn');
  assert.equal(batteryLevel(10), 'bad');
  assert.equal(batteryLevel(null), 'none');
});

test('rssiBars maps dBm to 0..4 bars', () => {
  assert.equal(rssiBars(-43), 4);
  assert.equal(rssiBars(-65), 3);
  assert.equal(rssiBars(-75), 2);
  assert.equal(rssiBars(-85), 1);
  assert.equal(rssiBars(-99), 0);
  assert.equal(rssiBars(null), 0);
});
