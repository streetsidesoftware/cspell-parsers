import { parse } from '@cspell/parser-typescript/parser';
import { TAGS } from '@cspell/parser-typescript/tags';
import type { PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { tags } from './tags.js';

export { parse };

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['javascript', 'javascriptreact']);

export const parser: PluginParser = createPluginParser(
  {
    name: 'javascript',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  name?: string;
  /** Omit to keep the parser's own defaults (`code` excluded). */
  tags?: TagFilterOptions;
}

/**
 * Create a parser for JavaScript and JSX files. You can set the name of the parser and filter on the tags
 * if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-javascript/parser';
 *
 * const parser = createParser({
 *   name: 'javascript-comments-only',
 *   tags: { '*': false, comment: true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'javascript', parser: 'javascript-comments-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
