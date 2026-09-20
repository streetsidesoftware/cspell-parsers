import { parse } from '@cspell/parser-typescript/parser';
import type { ParserTags, PluginParser, TagFilterOptions } from '@internal/utils';
import { createPluginParser, customizeParser } from '@internal/utils';

export { parse };

export const supportedFileTypes: Readonly<string[]> = Object.freeze(['javascript', 'javascriptreact']);

const tags: Readonly<ParserTags> = Object.freeze({
  string: true,
  'string.singleQuote': true,
  'string.doubleQuote': true,
  'string.templateLiteral': true,
  comment: true,
  'comment.line': true,
  'comment.block': true,
  'comment.block.doc': true,
  identifier: true,
  'identifier.variable': true,
  'identifier.property': true,
  'identifier.privateProperty': true,
  'identifier.type': true,
  'identifier.shorthandProperty': true,
  'identifier.label': true,
  'identifier.importBinding': true,
  'identifier.exportBinding': true,
});

export const parser: PluginParser = createPluginParser({
  name: 'javascript',
  parse,
  supportedFileTypes,
  tags,
});

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
export function createParser(options: CustomizeParserOptions = {}): PluginParser {
  return customizeParser(parser, options);
}
