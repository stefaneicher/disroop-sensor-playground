import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { throttle } from '../src/throttle.ts';

test('throttle calls immediately, then once more with the latest args after the interval', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const calls: number[] = [];
  const t = throttle((v: number) => calls.push(v), 200);
  t(1); t(2); t(3);
  assert.deepEqual(calls, [1]);
  mock.timers.tick(200);
  assert.deepEqual(calls, [1, 3]);
  mock.timers.tick(500);
  t(4);
  assert.deepEqual(calls, [1, 3, 4]);
  mock.timers.reset();
});
