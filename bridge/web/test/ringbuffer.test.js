import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RingBuffer } from '../static/js/ringbuffer.js';

test('RingBuffer keeps the newest items in order', () => {
  const rb = new RingBuffer(3);
  assert.deepEqual(rb.toArray(), []);
  rb.push(1); rb.push(2);
  assert.deepEqual(rb.toArray(), [1, 2]);
  rb.push(3); rb.push(4);
  assert.deepEqual(rb.toArray(), [2, 3, 4]);
  assert.equal(rb.length, 3);
  assert.equal(rb.capacity, 3);
});

test('RingBuffer rejects invalid capacity', () => {
  assert.throws(() => new RingBuffer(0));
});
