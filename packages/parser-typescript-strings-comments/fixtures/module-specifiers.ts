import x from './mod.js';
import z from "./double-quoted.js";
import { y } from 'prettier';
import * as ns from './namespace.js';
import './side-effect.js';

export { x as reexported } from './mod.js';
export * from './star.js';

async function load() {
  const dynamic = await import('./dynamic.js');
  const required = require('./required.js');
  return { dynamic, required };
}

// False positives this must not tag: "from"/"require" used as ordinary identifiers, not the real keyword
// or global function.
const from = 'not a module specifier';
const myRequire = (id: string) => id;
const notRequired = myRequire('./not-a-specifier.js');
date.from('2024-01-01');

const plain = 'just a regular string, unrelated to any of this';
