import type { ParseResult } from '@cspell/cspell-types';
import type { CustomizeParserOptions, IParserEx } from '@internal/utils';
import { createPluginParserWithFilterTags, customizeParserEx } from '@internal/utils';

import { Scanner } from './scanner.ts';
import { tags } from './tags.ts';

export type { CustomizeParserOptions } from '@internal/utils';

/**
 * Parses PHP source, tagging its comments, string/heredoc/nowdoc literals, and the HTML markup surrounding
 * `<?php ... ?>` regions with their own specific tags, and everything else (identifiers, keywords,
 * punctuation, numbers, tag delimiters) as plain `code` - so the full file content is covered.
 */
export function parse(content: string, filename: string): ParseResult {
  return { content, filename, parsedTexts: new Scanner(content).run() };
}

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['php']);

/** Both `code` and `html` are off by default through `tags`. */
export const parser: IParserEx = createPluginParserWithFilterTags({
  name: 'php-strings-comments',
  parse,
  supportedFileTypes,
  tags,
});

/**
 * @deprecated Use `plugin.customize()` from `@cspell/parser-php-strings-comments/plugin` instead.
 *
 * Create a parser for PHP files. You can set the name of the parser and filter on the tags if desired.
 *
 * The name is used to select the parser via the
 * [cspell `parser`](https://cspell.org/docs/api/cspell-types/interfaces/CSpellSettings#parser) setting.
 *
 * Usage: **`cspell.config.mts`**
 * ```ts
 * import { createParser } from '@cspell/parser-php-strings-comments/parser';
 *
 * const parser = createParser({
 *   name: 'php-code-only',
 *   tags: { '*': false, string: true, comment: true },
 * });
 *
 * export default {
 *   plugins: [{ parsers: [parser] }],
 *   languageSettings: [{ languageId: 'php', parser: 'php-code-only' }],
 * };
 * ```
 */
export function createParser(options: CustomizeParserOptions = {}): IParserEx {
  return customizeParserEx(parser, options);
}
