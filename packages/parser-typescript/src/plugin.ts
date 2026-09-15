import type { Plugin } from '@cspell/cspell-types';
import { parser } from './parser.js';

export const plugin: Plugin = {
  parsers: [parser],
};
