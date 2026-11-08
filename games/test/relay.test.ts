import assert from 'node:assert/strict';
import { test } from 'node:test';
import { padUrl, parseRelayMessage, relayOrigin, relayWs } from '../src/input/relay.ts';

test('relayOrigin: empty/same = page origin, hosts and ws URLs become http(s) origins', () => {
  assert.equal(relayOrigin('', 'https://play.example'), 'https://play.example');
  assert.equal(relayOrigin('same', 'http://localhost:8080'), 'http://localhost:8080');
  assert.equal(relayOrigin('relay.example', 'https://x'), 'https://relay.example');
  assert.equal(relayOrigin('wss://relay.example/ws', 'https://x'), 'https://relay.example');
  assert.equal(relayOrigin('ws://192.168.1.5:8080', 'https://x'), 'http://192.168.1.5:8080');
});

test('relayWs and padUrl', () => {
  assert.equal(relayWs('https://relay.example', '/ws/screen'), 'wss://relay.example/ws/screen');
  assert.equal(relayWs('http://localhost:8080', '/ws/pad'), 'ws://localhost:8080/ws/pad');
  assert.equal(padUrl('https://relay.example', 'K7Q2'), 'https://relay.example/games/pad/?room=K7Q2');
});

test('parseRelayMessage accepts the protocol and rejects garbage', () => {
  assert.deepEqual(parseRelayMessage('{"type":"room","room":"K7Q2"}'), { type: 'room', room: 'K7Q2' });
  assert.deepEqual(parseRelayMessage('{"type":"join","pad":2,"name":"Mia","color":"#fff"}'), {
    type: 'join',
    pad: 2,
    name: 'Mia',
    color: '#fff',
  });
  assert.deepEqual(parseRelayMessage('{"type":"leave","pad":2}'), { type: 'leave', pad: 2 });
  const f = parseRelayMessage('{"type":"frame","pad":1,"f":{"t":1,"q":[1,0,0,0],"gyro":[0,0,0],"accel":[0,0,1],"button":false}}');
  assert.equal(f?.type, 'frame');
  assert.equal(parseRelayMessage('{"type":"frame","pad":1,"f":{"t":1}}'), null);
  assert.equal(parseRelayMessage('{"type":"join","pad":0,"name":"x","color":"y"}'), null);
  assert.equal(parseRelayMessage('{"type":"nope"}'), null);
  assert.equal(parseRelayMessage('nope'), null);
  assert.deepEqual(parseRelayMessage('{"type":"error","text":"unbekannter Raum"}'), { type: 'error', text: 'unbekannter Raum' });
});
