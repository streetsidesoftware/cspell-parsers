import { createParsedTextFilter } from './customize.ts';
import type { CustomizeParserOptions, ParsedTextFilter, ParseFunction, ParserTags, PluginParser } from './types.ts';

export type CreatePluginParserOptions = Pick<PluginParser, 'name' | 'parse' | 'supportedFileTypes' | 'tags'>;

export function createPluginParser(options: CreatePluginParserOptions, filter?: ParsedTextFilter): PluginParser {
  return new PluginParserImpl(options.name, options.parse, options.supportedFileTypes, options.tags, filter);
}

/**
 * Wraps a single `Parser` so its `parse()` output only includes `parsedTexts` selected by
 * `options.tags`, and its `name` is `options.name` when given. `options.tags` is compiled into a
 * {@link TagsFilter} once here, before the parser ever runs - see {@link compileTagFilter}.
 */
export function customizeParser(parser: PluginParser, options: CustomizeParserOptions): PluginParser {
  return parser.customize(options);
}

export function createParse(parse: ParseFunction, filter?: ParsedTextFilter): ParseFunction {
  if (!filter) return parse;
  return (content: string, filename: string) => {
    const result = parse(content, filename);
    if (!filter) return result;
    return { ...result, parsedTexts: filterIterable(result.parsedTexts, filter) };
  };
}

class PluginParserImpl implements PluginParser {
  #parse: ParseFunction;
  #supportedFileTypes: Readonly<string[]>;
  #tags: Readonly<ParserTags>;
  #name: string;
  #filter?: ParsedTextFilter | undefined;
  parse: ParseFunction;

  constructor(
    name: string,
    parse: ParseFunction,
    supportedFileTypes: Readonly<string[]>,
    tags: Readonly<ParserTags>,
    filter?: ParsedTextFilter,
  ) {
    this.#name = name;
    this.#parse = parse;
    this.#supportedFileTypes = supportedFileTypes;
    this.#tags = tags;
    this.#filter = filter;
    this.parse = createParse(parse, filter);
  }

  get name() {
    return this.#name;
  }

  get supportedFileTypes() {
    return this.#supportedFileTypes;
  }

  get tags() {
    return this.#tags;
  }

  customize(options: CustomizeParserOptions): PluginParser {
    const filter = options?.tags ? createParsedTextFilter(options.tags, this.#tags) : this.#filter;
    return new PluginParserImpl(options?.name ?? this.#name, this.#parse, this.#supportedFileTypes, this.#tags, filter);
  }

  customizeFilter(filter: ParsedTextFilter): PluginParser {
    return new PluginParserImpl(this.#name, this.#parse, this.#supportedFileTypes, this.#tags, filter);
  }

  customizeSupportedFileTypes(supportedFileTypes: Readonly<string[]>): PluginParser {
    return new PluginParserImpl(this.#name, this.#parse, supportedFileTypes, this.#tags, this.#filter);
  }
}

function* filterIterable<T>(iterable: Iterable<T>, filter: (item: T) => boolean): Iterable<T> {
  for (const item of iterable) {
    if (filter(item)) {
      yield item;
    }
  }
}
