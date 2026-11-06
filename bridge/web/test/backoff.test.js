import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backoffDelay } from '../static/js/backoff.js';

test('backoffDelay doubles from 500 ms up to 10 s', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(backoffDelay), [500, 1000, 2000, 4000, 8000, 10000, 10000]);
});
