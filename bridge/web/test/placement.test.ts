import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placePopover } from '../src/placement.ts';

const vp = { width: 400, height: 800 };
const pop = { width: 300, height: 150 };

test('centres the popover below its anchor when there is room', () => {
  const p = placePopover({ left: 190, top: 100, width: 20, height: 20 }, pop, vp);
  assert.deepEqual(p, { left: 50, top: 128, above: false, arrowX: 150 });
});

test('clamps to the viewport edges and keeps the arrow on the anchor', () => {
  const left = placePopover({ left: 0, top: 100, width: 20, height: 20 }, pop, vp);
  assert.equal(left.left, 8);
  assert.equal(left.arrowX, 12);
  const right = placePopover({ left: 380, top: 100, width: 20, height: 20 }, pop, vp);
  assert.equal(right.left, 92);
  assert.equal(right.arrowX, 288);
});

test('flips above the anchor near the bottom, stays below when neither fits', () => {
  const p = placePopover({ left: 190, top: 700, width: 20, height: 20 }, pop, vp);
  assert.equal(p.above, true);
  assert.equal(p.top, 700 - 8 - 150);
  const tiny = placePopover({ left: 190, top: 100, width: 20, height: 20 }, { width: 300, height: 900 }, vp);
  assert.equal(tiny.above, false);
});

test('a popover wider than the viewport starts at the margin', () => {
  assert.equal(placePopover({ left: 10, top: 10, width: 20, height: 20 }, { width: 500, height: 10 }, vp).left, 8);
});
