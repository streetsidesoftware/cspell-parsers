import test from 'node:test';
import assert from 'node:assert/strict';

import { createExampleParser } from './index.js';

test('createExampleParser parses whitespace-delimited words', () => {
  const parser = createExampleParser();

  assert.deepEqual(parser.parse('one   two\nthree'), ['one', 'two', 'three']);
});
