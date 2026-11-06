import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectStream } from '../static/js/connection.js';

class FakeEventSource {
  static CLOSED = 2;
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.listeners = {};
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  emit(type, data) { this.listeners[type]?.({ data }); }
  close() { this.readyState = FakeEventSource.CLOSED; }
}

function setup() {
  FakeEventSource.instances = [];
  const events = [];
  const timers = [];
  const handle = connectStream('/api/stream', {
    EventSource: FakeEventSource,
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
    onOpen: () => events.push(['open']),
    onError: () => events.push(['error']),
    onTelemetry: (s) => events.push(['telemetry', s]),
    onLog: (m) => events.push(['log', m]),
  });
  return { events, timers, handle, es: () => FakeEventSource.instances.at(-1) };
}

test('dispatches parsed telemetry and log events', () => {
  const { events, es } = setup();
  es().emit('open');
  es().emit('telemetry', '{"ts":1}');
  es().emit('log', '{"msg":"hallo"}');
  es().emit('telemetry', 'garbage');
  assert.deepEqual(events, [['open'], ['telemetry', { ts: 1 }], ['log', 'hallo']]);
});

test('lets EventSource auto-reconnect while it is still connecting', () => {
  const { events, timers, es } = setup();
  es().readyState = 0;
  es().emit('error');
  assert.deepEqual(events, [['error']]);
  assert.equal(timers.length, 0);
});

test('reopens a closed stream with exponential backoff', () => {
  const { timers, es } = setup();
  const first = es();
  first.readyState = FakeEventSource.CLOSED;
  first.emit('error');
  assert.equal(timers[0].ms, 500);
  timers[0].fn();
  assert.notEqual(es(), first);
  es().readyState = FakeEventSource.CLOSED;
  es().emit('error');
  assert.equal(timers[1].ms, 1000);
});

test('close stops the stream', () => {
  const { handle, es } = setup();
  handle.close();
  assert.equal(es().readyState, FakeEventSource.CLOSED);
});
