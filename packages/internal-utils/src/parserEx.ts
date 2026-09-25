import { createParsedTextFilter } from './customize.ts';
import { createParse } from './parser.ts';
import type { IParserEx, ParseFunction, ParserTags, TagFilterOptions } from './types.ts';

export interface CreatePluginParserWithFilterTagsOptions {
  name: string;
  /** The unfiltered parse; the default filter comes from `tags`. */
  parse: ParseFunction;
  supportedFileTypes: readonly string[];
  /** Every tag the parser can emit, `true` if it's checked by default. */
  tags: Readonly<ParserTags>;
}

/** Creates a parser whose default filter comes only from `options.tags`. */
export function createPluginParserWithFilterTags(options: CreatePluginParserWithFilterTagsOptions): IParserEx {
  return new ParserDef(options.name, options.parse, options.supportedFileTypes, options.tags, undefined).parser;
}

export interface ParserDefChanges {
  name?: string;
  fileTypes?: readonly string[];
  filterTags?: Readonly<TagFilterOptions> | undefined;
}

/**
 * An immutable parser definition: the original `_parse` and `tags` held privately, plus the current name, file
 * types, and filter. Changes return a new definition; `parser` compiles the filter against the originals.
 */
export class ParserDef {
  /** Lets `ParserDef.from` return the same parser object, e.g. so a plugin's `parsers` include the exported `parser`. */
  static readonly #defsByParser = new WeakMap<IParserEx, ParserDef>();

  readonly #parse: ParseFunction;
  readonly #tags: Readonly<ParserTags>;
  readonly name: string;
  readonly fileTypes: readonly string[];
  readonly filterTags: Readonly<TagFilterOptions> | undefined;
  #parser: IParserEx | undefined;

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

  /** Reads any package's `IParserEx` through its public data; one this module created maps back to its own definition. */
  static from(parser: IParserEx): ParserDef {
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

  /** The read-only parser cspell sees. */
  get parser(): IParserEx {
    this.#parser ??= this.#createParser();
    return this.#parser;
  }

  #createParser(): IParserEx {
    const parser = this.#buildParser();
    ParserDef.#defsByParser.set(parser, this);
    return parser;
  }

  #buildParser(): IParserEx {
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

/** Drops `undefined` entries, which the matcher ignores; `undefined` when nothing is left, meaning the defaults apply. */
function normalizeFilterTags(
  filterTags: Readonly<TagFilterOptions> | undefined,
): Readonly<TagFilterOptions> | undefined {
  if (!filterTags) return undefined;
  const entries = Object.entries(filterTags).filter(([, value]) => value !== undefined);
  return entries.length ? Object.freeze(Object.fromEntries(entries)) : undefined;
}
