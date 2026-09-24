import { parse } from '@cspell/parser-typescript/parser';
import { TAGS } from '@cspell/parser-typescript/tags';
import type { CustomizeParserOptions, IParser } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

import { tags } from './tags.ts';

export type { CustomizeParserOptions } from '@internal/utils';

export { parse };

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['javascript', 'javascriptreact']);

export const parser: IParser = createPluginParser(
  {
    name: 'javascript',
    parse,
    supportedFileTypes,
    tags,
  },
  (p) => p.tags !== TAGS.CODE,
);

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
export function createParser(options: CustomizeParserOptions = {}): IParser {
  return customizeParser(parser, options);
}
