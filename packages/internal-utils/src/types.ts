import type { CSpellPlugin, ParsedTags, ParsedText, ParseResult } from '@cspell/cspell-types';

export interface ParserTags {
  /**
   * A dictionary of parser tags, where the key is the tag name and the value indicates if it will be emitted.
   */
  [tag: string]: boolean;
}

export type ParseFunction = (content: string, filename: string) => ParseResult;
export type ParsedTextFilter = (parsedText: ParsedText) => boolean;

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
 * Which tagged segments to keep.
 *
 * Deliberately declared here rather than imported from `@cspell/cspell-types`'s `ValidationTags` - the
 * two happen to share a shape today, but that's incidental. These options are a property of this repo's
 * own filtering behavior and should be free to diverge from it.
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
 * A parser as read-only data, with no customization methods.
 * A builder in any package can re-filter it, because `_parse` gives it the unfiltered output.
 * See docs/ADRs/plugin-customization/0007-parser-data.md.
 */
export interface IParser {
  /** The name cspell uses to select this parser in `languageSettings`. */
  readonly name: string;
  /** Parses a file for cspell, keeping only the segments the current tag filter allows. */
  readonly parse: ParseFunction;
  /**
   * Parses a file without any tag filter applied.
   * Plugin builders use it to compile a new filter from the original output.
   */
  readonly _parse: ParseFunction;
  /**
   * The file types this parser is designed for.
   * They're used to generate `languageSettings`, and don't restrict which files the parser can be used for.
   */
  readonly supportedFileTypes: readonly string[];
  /** Maps every tag this parser can emit to whether it's spell checked by default. */
  readonly tags: Readonly<ParserTags>;
  /**
   * The tag filter options currently compiled into `parse`.
   * It's absent when `parse` uses the defaults from `tags`.
   */
  readonly filterTags?: Readonly<TagFilterOptions>;
}

/** Selects parsers by a single name, a list of names, or `'*'` for every parser. */
export type ParserTarget = string | readonly string[];

/** Selects file types by a single file type, a list of them, or `'*'` for every file type the parsers list. */
export type FileTypeTarget = string | readonly string[];

/**
 * The immutable plugin each parser package exports.
 * {@link IPluginBuilder} extends it with the customization methods.
 * See docs/ADRs/plugin-customization/0004-immutable-plugin-and-builder.md.
 */
export interface IPlugin {
  /** The plugin's name. */
  readonly name: string;
  /**
   * Returns the plugin's parsers, in order.
   * Each read returns a new array, so changing it doesn't change the plugin.
   */
  readonly parsers: IParser[];
  /** Returns every file type the parsers list, without duplicates, in parser order. */
  readonly supportedFileTypes: readonly string[];
  /** Returns the parser names, in order, ready to use as a {@link ParserTarget}. */
  parserNames(): string[];
  /**
   * Returns the parser with the given name.
   * Throws if the plugin has no parser with that name.
   */
  getParser(name: string): IParser;
  /** Reports whether the plugin has a parser with the given name. */
  hasParser(name: string): boolean;
  /** Returns the names of the parsers that list `fileType`, in parser order. */
  parserNamesFor(fileType: string): string[];
  /**
   * Generates the `languageSettings` for every parser.
   * It's the same as `languageSettingsFor('*')`.
   */
  languageSettings(): RecommendedLanguageSettings;
  /**
   * Generates the `languageSettings` for the named parsers.
   * When several of them list the same file type, the last one gets it.
   */
  languageSettingsFor(target: ParserTarget): RecommendedLanguageSettings;
  /**
   * Generates `languageSettings` that map `fileTypes` to the named parser.
   * Without `fileTypes`, it uses the parser's own file types.
   */
  languageSettingsFor(name: string, fileTypes?: readonly string[]): RecommendedLanguageSettings;
  /**
   * Generates the `languageSettings` for only the given file types.
   * Each file type goes to the last parser that lists it.
   * Throws if no parser lists one of them.
   */
  languageSettingsForFileType(fileType: FileTypeTarget): RecommendedLanguageSettings;
  /**
   * Creates a new builder, starting from the current parsers.
   * The builder is named `name`, or keeps this plugin's name when `name` is omitted.
   */
  customize(name?: string): IPluginBuilder;
  /**
   * Returns `settings` with this plugin added to `plugins` and its `languageSettings()` added to `languageSettings`.
   * The plugin's entries go first, so the user's own entries win.
   * A builder is added as a `build()` snapshot.
   * See docs/ADRs/plugin-customization/0009-define-config.md.
   */
  defineConfig<T extends DefineConfigSettings = Record<never, never>>(settings?: T): DefinedConfig<T>;
}

/** The settings keys `defineConfig` merges; every other key is copied as it is. */
export interface DefineConfigSettings {
  plugins?: readonly CSpellPlugin[] | undefined;
  languageSettings?: readonly object[] | undefined;
  [key: string]: unknown;
}

/** The type of the user's own `languageSettings` entries, or `never` when there are none. */
type LanguageSettingOf<T> = T extends { languageSettings: readonly (infer E)[] } ? E : never;

/** The result of `defineConfig`: the user's settings with the plugin merged in. */
export type DefinedConfig<T extends DefineConfigSettings> = Omit<T, 'plugins' | 'languageSettings'> & {
  plugins: CSpellPlugin[];
  languageSettings: (RecommendedLanguageSetting | LanguageSettingOf<T>)[];
};

/**
 * Customizes a plugin in place, with each method returning the builder so calls can be chained.
 * It can be passed to cspell directly as a plugin.
 * A parser name that's unknown, or already taken, throws.
 * See docs/ADRs/plugin-customization/0005-builder-operations.md.
 */
export interface IPluginBuilder extends IPlugin {
  /** Sets the plugin's name. */
  setName(name: string): this;
  /** Appends a copy of the named parser, with its current file types and filter, under `newName`. */
  duplicateParser(name: string, newName: string): this;
  /**
   * Appends `parser`, keeping its file types and filter.
   * It's added under `asName`, or under its own name when `asName` is omitted.
   */
  addParser(parser: IParser, asName?: string): this;
  /** Renames a parser without changing its position, file types, or filter. */
  renameParser(name: string, newName: string): this;
  /** Removes the targeted parsers. */
  removeParser(target: ParserTarget): this;
  /** Replaces the file types of the targeted parsers. */
  setFileTypes(target: ParserTarget, fileTypes: readonly string[]): this;
  /** Adds file types to the targeted parsers. */
  addFileTypes(target: ParserTarget, fileTypes: readonly string[]): this;
  /** Removes file types from the targeted parsers, keeping the parsers even if none are left. */
  removeFileTypes(target: ParserTarget, fileTypes: readonly string[]): this;
  /**
   * Replaces the tag filter of the targeted parsers.
   * The new filter is compiled from the original output, so filters never chain.
   * Passing `{}` resets a parser to the defaults from its `tags`.
   */
  filterTags(target: ParserTarget, options: TagFilterOptions): this;
  /**
   * Gives `fileType` its own parser, named `newName` and filtered by `options`.
   * The copy is made from the parser that currently handles `fileType`, and appended, so it wins `fileType`.
   * Existing parsers aren't changed.
   * Throws if no parser lists `fileType`, or for `'*'`.
   * See docs/ADRs/plugin-customization/0010-filter-tags-for-file-type.md.
   */
  filterTagsForFileType(fileType: string, options: TagFilterOptions, newName: string): this;
  /** Creates an immutable snapshot of the builder, which later builder calls don't affect. */
  build(): IPlugin;
}

/**
 * The options a package's `customizePlugin` accepts.
 * To rename a parser, use `renameParser` on the result.
 * See docs/ADRs/plugin-customization/0008-customize-plugin-wrapper.md.
 */
export interface CustomizePluginOptions {
  /** Not supported: `name` was removed. Rename a parser with `renameParser` instead. */
  name?: undefined;
  /** Chooses which tagged segments every parser keeps. */
  tags: TagFilterOptions;
}
