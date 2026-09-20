import type { Parser } from '@cspell/cspell-types/Parser';
import { parse } from '@cspell/parser-typescript/parser';
import type { TagFilterOptions } from '@internal/utils';
import { customizeParser } from '@internal/utils';

export { parse };

export const parser: Parser = {
  name: 'javascript',
  parse,
};

export const supportedFileTypes: string[] = ['javascript', 'javascriptreact'];

/** Options for {@link createParser}: the parser's name, and which tagged segments to keep. */
export interface CustomizeParserOptions {
  name?: string;
  /** Omit to keep everything. */
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
export function createParser(options: CustomizeParserOptions = {}): Parser {
  return customizeParser(parser, options);
}
