import type { CSpellPlugin, ParsedTags, ParsedText, Parser as CSpellParser, ParseResult } from '@cspell/cspell-types';

export interface ParserTags {
  /**
   * A dictionary of parser tags, where the key is the tag name and the value indicates if it will be emitted.
   */
  [tag: string]: boolean;
}

export interface IParser extends CSpellParser {
  /**
   * The known list of file types that this parser is capable of handling.
   */
  supportedFileTypes: Readonly<string[]>;
  /**
   * The set of tags that this parser can emit.
   * Each key represents a tag name, and the corresponding boolean value
   * indicates whether the parser will emit that tag by default.
   */
  tags: Readonly<ParserTags>;

  /**
   * Customize this parser.
   *
   * This allows you to change the name and filter the text segments emitted by the parser
   * based on the specified tag filter options.
   *
   * @param options - The customization options to apply to the parser.
   * @returns A new parser with the specified customizations applied.
   */
  customize(options: CustomizeParserOptions): IParser;

  customizeFilter(filter: ParsedTextFilter): IParser;
  customizeSupportedFileTypes(supportedFileTypes: Readonly<string[]>): IParser;
}

export type ParseFunction = (content: string, filename: string) => ParseResult;
export type ParsedTextFilter = (parsedText: ParsedText) => boolean;

export interface IPlugin extends CSpellPlugin {
  name: string;
  parsers: IParser[];
  supportedFileTypes: Readonly<string[]>;
  recommendedLanguageSettings: RecommendedLanguageSettings;
}

export interface RecommendedLanguageSetting {
  languageId: string;
  parser: string;
}

export type RecommendedLanguageSettings = RecommendedLanguageSetting[];

export interface RecommendedSettings {
  plugins: CSpellPlugin[];
  languageSettings: RecommendedLanguageSettings;
}

/**
 * A tag name, or a `*`-wildcard pattern matching one (see {@link TagFilterOptions}).
 */
export type TagPattern = string;

/**
 * Options for {@link customizeParser}: which tagged segments to keep.
 *
 * Deliberately declared here rather than imported from `@cspell/cspell-types`'s `ValidationTags` - the
 * two happen to share a shape today, but that's incidental. `customizeParser`'s options are a property of
 * its own filtering behavior and should be free to diverge from it.
 */
export interface TagFilterOptions {
  /**
   * The default filter setting for any tag not otherwise matched.
   * @default true
   */
  '*'?: boolean | undefined;

  /**
   * Filter setting for the specific tag or wildcard pattern.
   *
   * If not specified, the default (`'*'`) will be used.
   */
  [tag: TagPattern]: boolean | undefined;
}

/**
 * Decides whether a `ParsedText` should be kept (spell checked), given its `tags`.
 */
export type TagsFilter = (tags: ParsedTags | undefined) => boolean;

/**
 * Options for {@link IParser.customize}, as a struct rather than a bare `TagFilterOptions` so it can grow
 * more options later without a breaking signature change.
 */
export interface CustomizeParserOptions {
  /**
   * Override the parser's `name`. Useful when registering more than one customized copy of the same
   * parser (e.g. under `plugins`), since cspell selects a parser by name and two parsers can't share one.
   */
  name?: string;
  /**
   * Which tagged segments to keep. Omit to keep the parser's own defaults.
   */
  tags?: TagFilterOptions;
}

/** Options for a plugin's `customizePlugin`; the same as {@link CustomizeParserOptions}, applied to each of its parsers. */
export type CustomizePluginOptions = CustomizeParserOptions;

/**
 * A read-only parser. Plain data, so a builder in any package can re-filter it from `_parse`.
 * See docs/ADRs/plugin-customization/0007-parser-data.md.
 */
export interface IParserEx {
  readonly name: string;
  /** What cspell calls: `_parse` with the current tag filter applied. */
  readonly parse: ParseFunction;
  /**
   * The unfiltered parse.
   * Plumbing for plugin builders.
   */
  readonly _parse: ParseFunction;
  /**
   * File types used to generate `languageSettings`.
   * They don't restrict what the parser can be used for.
   */
  readonly supportedFileTypes: readonly string[];
  /** Every tag the parser can emit, `true` if it's checked by default. */
  readonly tags: Readonly<ParserTags>;
  /**
   * The tag filter compiled into `parse`.
   * Absent when the defaults from `tags` apply.
   */
  readonly filterTags?: Readonly<TagFilterOptions>;
}

/** A parser name, a list of parser names, or `'*'` for every parser. */
export type ParserTarget = string | readonly string[];

/** A file type, a list of file types, or `'*'` for every file type the parsers list. */
export type FileTypeTarget = string | readonly string[];

/** Read-only members shared by {@link IPluginEx} and {@link IPluginBuilder}. */
export interface IPluginExBase {
  readonly name: string;
  /**
   * The parsers, in order.
   * A new array on every read.
   */
  readonly parsers: IParserEx[];
  /** The set of the parsers' file types, in parser order. */
  readonly supportedFileTypes: readonly string[];
  /** The parser names, in order. */
  parserNames(): string[];
  /** Throws if there's no parser with that name. */
  getParser(name: string): IParserEx;
  hasParser(name: string): boolean;
  /** Names of the parsers that list `fileType`, in parser order. */
  parserNamesFor(fileType: string): string[];
  /** Same as `languageSettingsFor('*')`. */
  languageSettings(): RecommendedLanguageSettings;
  /**
   * `languageSettings` for the targeted parsers.
   * Each file type goes to the last targeted parser that lists it.
   */
  languageSettingsFor(target: ParserTarget): RecommendedLanguageSettings;
  /** `languageSettings` mapping `fileTypes` (default: the parser's own) to the named parser. */
  languageSettingsFor(name: string, fileTypes?: readonly string[]): RecommendedLanguageSettings;
  /**
   * `languageSettings` for only the given file types, each going to the last parser that lists it.
   * Throws if no parser lists one of them.
   */
  languageSettingsForFileType(fileType: FileTypeTarget): RecommendedLanguageSettings;
  /**
   * A new builder, seeded from the current parsers.
   * It's named `name`, or this plugin's name by default.
   */
  customize(name?: string): IPluginBuilder;
}

/**
 * The immutable plugin a package exports.
 * See docs/ADRs/plugin-customization/0004-immutable-plugin-and-builder.md.
 */
export type IPluginEx = IPluginExBase;

/**
 * Customizes a plugin in place; each method returns the builder. Usable directly as a cspell plugin.
 * Unknown or clashing parser names throw. See docs/ADRs/plugin-customization/0005-builder-operations.md.
 */
export interface IPluginBuilder extends IPluginExBase {
  /** Sets the plugin's name. */
  setName(name: string): this;
  /** Appends a copy of the parser's current state under `newName`. */
  duplicateParser(name: string, newName: string): this;
  /** Appends `parser`, keeping its file types and filter, under `asName` or its own name. */
  addParser(parser: IParserEx, asName?: string): this;
  /** Changes only the name; the parser keeps its position. */
  renameParser(name: string, newName: string): this;
  removeParser(target: ParserTarget): this;
  setFileTypes(target: ParserTarget, fileTypes: readonly string[]): this;
  addFileTypes(target: ParserTarget, fileTypes: readonly string[]): this;
  removeFileTypes(target: ParserTarget, fileTypes: readonly string[]): this;
  /** Replaces the targeted parsers' filter; `{}` resets to the defaults from `tags`. Filters never chain. */
  filterTags(target: ParserTarget, options: TagFilterOptions): this;
  /** An immutable snapshot that later builder calls don't affect. */
  build(): IPluginEx;
}

/**
 * Options for a migrated package's `customizePlugin`. Renaming a parser goes through `renameParser`, or the deprecated
 * `CustomizeParserOptions` overload. See docs/ADRs/plugin-customization/0008-customize-plugin-wrapper.md.
 */
export interface CustomizePluginExOptions {
  name?: undefined;
  /** Which tagged segments to keep, applied to every parser. */
  tags: TagFilterOptions;
}
