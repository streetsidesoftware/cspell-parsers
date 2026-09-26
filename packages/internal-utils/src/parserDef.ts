import { createParsedTextFilter } from './customize.ts';
import type { IParser, ParsedTextFilter, ParseFunction, ParserTags, TagFilterOptions } from './types.ts';

export interface CreatePluginParserWithFilterTagsOptions {
  name: string;
  /**
   * Parses a file without any tag filtering.
   * The parser's default filter comes from `tags`.
   */
  parse: ParseFunction;
  supportedFileTypes: readonly string[];
  /** Maps every tag the parser can emit to whether it's spell checked by default. */
  tags: Readonly<ParserTags>;
}

/** Creates a parser whose default filter comes only from `options.tags`. */
export function createPluginParserWithFilterTags(options: CreatePluginParserWithFilterTagsOptions): IParser {
  return new ParserDef(options.name, options.parse, options.supportedFileTypes, options.tags, undefined).parser;
}

export interface ParserDefChanges {
  name?: string;
  fileTypes?: readonly string[];
  filterTags?: Readonly<TagFilterOptions> | undefined;
}

/**
 * An immutable parser definition.
 * It keeps the original `_parse` and `tags` private, alongside the current name, file types, and filter.
 * Changes return a new definition.
 * `parser` compiles the current filter against the originals.
 */
export class ParserDef {
  /**
   * Maps each parser this module created back to its definition.
   * `from` uses it to return the same parser object, so a plugin's `parsers` include the exported `parser`.
   */
  static readonly #defsByParser = new WeakMap<IParser, ParserDef>();

  readonly #parse: ParseFunction;
  readonly #tags: Readonly<ParserTags>;
  readonly name: string;
  readonly fileTypes: readonly string[];
  readonly filterTags: Readonly<TagFilterOptions> | undefined;
  #parser: IParser | undefined;

  constructor(
    name: string,
    parse: ParseFunction,
    fileTypes: readonly string[],
    tags: Readonly<ParserTags>,
    filterTags: Readonly<TagFilterOptions> | undefined,
  ) {
    this.name = name;
    this.#parse = parse;
    this.fileTypes = Object.freeze([...new Set(fileTypes)]);
    this.#tags = Object.isFrozen(tags) ? tags : Object.freeze({ ...tags });
    this.filterTags = normalizeFilterTags(filterTags);
  }

  /**
   * Reads any package's `IParser` through its public data.
   * A parser this module created maps back to its own definition.
   */
  static from(parser: IParser): ParserDef {
    return (
      ParserDef.#defsByParser.get(parser) ??
      new ParserDef(parser.name, parser._parse, parser.supportedFileTypes, parser.tags, parser.filterTags)
    );
  }

  with(changes: ParserDefChanges): ParserDef {
    return new ParserDef(
      changes.name ?? this.name,
      this.#parse,
      changes.fileTypes ?? this.fileTypes,
      this.#tags,
      'filterTags' in changes ? changes.filterTags : this.filterTags,
    );
  }

  /** Returns the read-only parser that cspell uses, creating it on first use. */
  get parser(): IParser {
    this.#parser ??= this.#createParser();
    return this.#parser;
  }

  #createParser(): IParser {
    const parser = this.#buildParser();
    ParserDef.#defsByParser.set(parser, this);
    return parser;
  }

  #buildParser(): IParser {
    const tags = this.#tags;
    const filterTags = this.filterTags;
    const keepsEverything = !filterTags && Object.values(tags).every(Boolean);
    const filter = keepsEverything ? undefined : createParsedTextFilter(filterTags ?? {}, tags);
    return Object.freeze({
      name: this.name,
      parse: createParse(this.#parse, filter),
      _parse: this.#parse,
      supportedFileTypes: this.fileTypes,
      tags,
      ...(filterTags ? { filterTags } : {}),
    });
  }
}

/**
 * Drops `undefined` entries, which the matcher ignores.
 * Returns `undefined` when nothing is left, meaning the defaults apply.
 */
function normalizeFilterTags(
  filterTags: Readonly<TagFilterOptions> | undefined,
): Readonly<TagFilterOptions> | undefined {
  if (!filterTags) return undefined;
  const entries = Object.entries(filterTags).filter(([, value]) => value !== undefined);
  return entries.length ? Object.freeze(Object.fromEntries(entries)) : undefined;
}

export function createParse(parse: ParseFunction, filter?: ParsedTextFilter): ParseFunction {
  if (!filter) return parse;
  return (content: string, filename: string) => {
    const result = parse(content, filename);
    return { ...result, parsedTexts: filterIterable(result.parsedTexts, filter) };
  };
}

function* filterIterable<T>(iterable: Iterable<T>, filter: (item: T) => boolean): Iterable<T> {
  for (const item of iterable) {
    if (filter(item)) {
      yield item;
    }
  }
}
