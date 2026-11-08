import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate } from '../dev/gen-types.js';
import type { Snapshot } from '../src/telemetry.ts';

const schema = JSON.parse(readFileSync(new URL('../../../../docs/telemetry.schema.json', import.meta.url), 'utf8'));
const example = JSON.parse(readFileSync(new URL('../../../shared/telemetry.example.json', import.meta.url), 'utf8'));

test('src/telemetry.ts is up to date with docs/telemetry.schema.json (run ./project web types)', () => {
  assert.equal(readFileSync(new URL('../src/telemetry.ts', import.meta.url), 'utf8'), generate(schema));
});

test('generated types map nullable fields, enums, $defs and optional keys', () => {
  const code = generate({
    $defs: { num: { type: ['number', 'null'] } },
    type: 'object',
    required: ['a', 'part'],
    properties: {
      a: { $ref: '#/$defs/num' },
      e: { enum: ['x', 'y', null] },
      part: { type: 'object', required: ['n'], properties: { n: { type: 'integer' }, s: { type: ['string', 'null'] } } },
    },
  });
  assert.match(code, /export type Num = number \| null;/);
  assert.match(code, /  a: Num;\n  e\?: "x" \| "y" \| null;\n  part: \{\n    n: number;\n    s\?: string \| null;\n  \};/);
  assert.match(code, /export type Part = Snapshot\['part'\];/);
});

test('the shared example snapshot has every required top-level key of Snapshot', () => {
  const keys: (keyof Snapshot)[] = ['ts', 'connected', 'device', 'motion', 'environment', 'sound', 'ui'];
  assert.deepEqual(Object.keys(example).sort(), [...keys].sort());
});
