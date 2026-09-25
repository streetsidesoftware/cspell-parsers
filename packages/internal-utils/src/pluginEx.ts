import type { ParserDefChanges } from './parserEx.ts';
import { ParserDef } from './parserEx.ts';
import type {
  CustomizeParserOptions,
  CustomizePluginExOptions,
  DefineConfigSettings,
  DefinedConfig,
  FileTypeTarget,
  IParserEx,
  IPluginBuilder,
  IPluginEx,
  IPluginExBase,
  ParserTarget,
  RecommendedLanguageSettings,
  TagFilterOptions,
} from './types.ts';

export interface CreatePluginExOptions {
  name: string;
  /** The plugin's parsers, in order, each with a unique name. */
  parsers: readonly IParserEx[];
}

/** Creates the immutable plugin a package exports. */
export function createPluginEx(options: CreatePluginExOptions): IPluginEx {
  const defs: ParserDef[] = [];
  for (const parser of options.parsers) {
    assertNameIsFree(options.name, defs, parser.name);
    defs.push(ParserDef.from(parser));
  }
  return new PluginEx(options.name, defs);
}

/** Implements the read-only plugin members over an ordered list of parser definitions. */
abstract class PluginExQueries implements IPluginExBase {
  abstract get name(): string;
  protected abstract get defs(): readonly ParserDef[];
  /** Returns the immutable plugin that `defineConfig` registers. */
  protected abstract snapshot(): IPluginEx;

  get parsers(): IParserEx[] {
    return this.defs.map((def) => def.parser);
  }

  parserNames(): string[] {
    return this.defs.map((def) => def.name);
  }

  customize(name?: string): IPluginBuilder {
    return new PluginBuilder(name ?? this.name, this.defs);
  }

  get supportedFileTypes(): readonly string[] {
    return [...new Set(this.defs.flatMap((def) => def.fileTypes))];
  }

  defineConfig<T extends DefineConfigSettings = Record<never, never>>(settings?: T): DefinedConfig<T> {
    const plugin = this.snapshot();
    return {
      ...settings,
      plugins: [plugin, ...(settings?.plugins ?? [])],
      languageSettings: [...plugin.languageSettings(), ...(settings?.languageSettings ?? [])],
    } as DefinedConfig<T>;
  }

  getParser(name: string): IParserEx {
    return this.findDef(name).parser;
  }

  hasParser(name: string): boolean {
    return this.defs.some((def) => def.name === name);
  }

  parserNamesFor(fileType: string): string[] {
    return this.defs.filter((def) => def.fileTypes.includes(fileType)).map((def) => def.name);
  }

  languageSettings(): RecommendedLanguageSettings {
    return this.languageSettingsFor('*');
  }

  languageSettingsFor(target: ParserTarget): RecommendedLanguageSettings;
  languageSettingsFor(name: string, fileTypes?: readonly string[]): RecommendedLanguageSettings;
  languageSettingsFor(target: ParserTarget, fileTypes?: readonly string[]): RecommendedLanguageSettings {
    if (fileTypes) {
      if (typeof target !== 'string' || target === '*') {
        throw new Error('Explicit fileTypes need a single parser name.');
      }
      this.findDef(target);
      return fileTypes.length ? [{ languageId: fileTypes.join(','), parser: target }] : [];
    }
    const names = this.resolveTarget(target);
    const defs = this.defs.filter((def) => names.has(def.name));
    const lastParserFor = lastParserByFileType(defs);
    return defs
      .map((def) => ({ def, types: def.fileTypes.filter((fileType) => lastParserFor.get(fileType) === def.name) }))
      .filter(({ types }) => types.length)
      .map(({ def, types }) => ({ languageId: types.join(','), parser: def.name }));
  }

  languageSettingsForFileType(fileType: FileTypeTarget): RecommendedLanguageSettings {
    if (fileType === '*') return this.languageSettings();
    const fileTypes = [...new Set(typeof fileType === 'string' ? [fileType] : fileType)];
    const lastParserFor = lastParserByFileType(this.defs);
    const unknown = fileTypes.filter((type) => !lastParserFor.has(type));
    if (unknown.length) throw unknownFileTypesError(this.name, [...lastParserFor.keys()], unknown);
    return this.defs
      .map((def) => ({ def, types: fileTypes.filter((type) => lastParserFor.get(type) === def.name) }))
      .filter(({ types }) => types.length)
      .map(({ def, types }) => ({ languageId: types.join(','), parser: def.name }));
  }

  /**
   * Resolves a target to the set of parser names it selects.
   * Throws on an unknown name before anything is changed.
   */
  protected resolveTarget(target: ParserTarget): Set<string> {
    if (target === '*') return new Set(this.defs.map((def) => def.name));
    const names = typeof target === 'string' ? [target] : target;
    const unknown = names.filter((name) => !this.hasParser(name));
    if (unknown.length) throw unknownParsersError(this.name, this.defs, unknown);
    return new Set(names);
  }

  protected findDef(name: string): ParserDef {
    const def = this.defs.find((d) => d.name === name);
    if (!def) throw unknownParsersError(this.name, this.defs, [name]);
    return def;
  }
}

class PluginEx extends PluginExQueries implements IPluginEx {
  readonly #name: string;
  readonly #defs: readonly ParserDef[];

  constructor(name: string, defs: readonly ParserDef[]) {
    super();
    this.#name = name;
    this.#defs = Object.freeze([...defs]);
    Object.freeze(this);
  }

  get name(): string {
    return this.#name;
  }

  protected get defs(): readonly ParserDef[] {
    return this.#defs;
  }

  protected snapshot(): IPluginEx {
    return this;
  }
}

class PluginBuilder extends PluginExQueries implements IPluginBuilder {
  #name: string;
  /**
   * Kept as an array, not a Map, because order decides the recommended parser.
   * A rename must also keep the parser in place, which a Map can't do.
   */
  #defs: ParserDef[];

  constructor(name: string, defs: readonly ParserDef[]) {
    super();
    this.#name = name;
    this.#defs = [...defs];
  }

  get name(): string {
    return this.#name;
  }

  setName(name: string): this {
    this.#name = name;
    return this;
  }

  protected get defs(): readonly ParserDef[] {
    return this.#defs;
  }

  duplicateParser(name: string, newName: string): this {
    const def = this.findDef(name);
    assertNameIsFree(this.name, this.#defs, newName);
    this.#defs.push(def.with({ name: newName }));
    return this;
  }

  addParser(parser: IParserEx, asName?: string): this {
    const name = asName ?? parser.name;
    assertNameIsFree(this.name, this.#defs, name);
    this.#defs.push(ParserDef.from(parser).with({ name }));
    return this;
  }

  renameParser(name: string, newName: string): this {
    const def = this.findDef(name);
    if (name === newName) return this;
    assertNameIsFree(this.name, this.#defs, newName);
    this.#defs[this.#defs.indexOf(def)] = def.with({ name: newName });
    return this;
  }

  removeParser(target: ParserTarget): this {
    const names = this.resolveTarget(target);
    this.#defs = this.#defs.filter((def) => !names.has(def.name));
    return this;
  }

  setFileTypes(target: ParserTarget, fileTypes: readonly string[]): this {
    return this.#update(target, () => ({ fileTypes }));
  }

  addFileTypes(target: ParserTarget, fileTypes: readonly string[]): this {
    return this.#update(target, (def) => ({ fileTypes: [...def.fileTypes, ...fileTypes] }));
  }

  removeFileTypes(target: ParserTarget, fileTypes: readonly string[]): this {
    const remove = new Set(fileTypes);
    return this.#update(target, (def) => ({ fileTypes: def.fileTypes.filter((fileType) => !remove.has(fileType)) }));
  }

  filterTags(target: ParserTarget, options: TagFilterOptions): this {
    return this.#update(target, () => ({ filterTags: options }));
  }

  filterTagsForFileType(fileType: string, options: TagFilterOptions, newName: string): this {
    if (fileType === '*') {
      throw new Error('filterTagsForFileType needs a file type, not "*"; use filterTags("*", ...).');
    }
    const source = this.parserNamesFor(fileType).at(-1);
    if (source === undefined) throw unknownFileTypesError(this.name, this.supportedFileTypes, [fileType], '');
    return this.duplicateParser(source, newName).setFileTypes(newName, [fileType]).filterTags(newName, options);
  }

  build(): IPluginEx {
    return new PluginEx(this.name, this.#defs);
  }

  protected snapshot(): IPluginEx {
    return this.build();
  }

  #update(target: ParserTarget, change: (def: ParserDef) => ParserDefChanges): this {
    const names = this.resolveTarget(target);
    this.#defs = this.#defs.map((def) => (names.has(def.name) ? def.with(change(def)) : def));
    return this;
  }
}

/**
 * Implements a package's `customizePlugin`.
 * It applies `tags` to every parser.
 * Given the deprecated `name`, it renames the plugin's only parser.
 * See docs/ADRs/plugin-customization/0008-customize-plugin-wrapper.md.
 */
export function customizePluginEx(
  plugin: IPluginEx,
  options?: CustomizePluginExOptions | CustomizeParserOptions,
): IPluginBuilder {
  const builder = plugin.customize();
  if (options?.name !== undefined) {
    const [only, ...others] = builder.parserNames();
    if (only === undefined || others.length) {
      throw new Error(
        `"name" only works for a plugin with one parser; use renameParser instead (plugin "${plugin.name}").`,
      );
    }
    builder.renameParser(only, options.name);
  }
  if (options?.tags) builder.filterTags('*', options.tags);
  return builder;
}

/**
 * Implements a package's deprecated `createParser`.
 * Returns a renamed and/or re-filtered copy of `parser`.
 */
export function customizeParserEx(parser: IParserEx, options: CustomizeParserOptions = {}): IParserEx {
  const builder = createPluginEx({ name: parser.name, parsers: [parser] }).customize();
  if (options.tags) builder.filterTags(parser.name, options.tags);
  const name = options.name ?? parser.name;
  if (name !== parser.name) builder.renameParser(parser.name, name);
  return builder.getParser(name);
}

function assertNameIsFree(pluginName: string, defs: readonly ParserDef[], name: string): void {
  if (!name || name === '*') throw new Error(`Invalid parser name ${JSON.stringify(name)} in plugin "${pluginName}".`);
  if (defs.some((def) => def.name === name)) {
    throw new Error(`Parser name "${name}" is already used in plugin "${pluginName}".`);
  }
}

/** Maps each file type to the last parser in `defs` that lists it. */
function lastParserByFileType(defs: readonly ParserDef[]): Map<string, string> {
  const lastParserFor = new Map<string, string>();
  for (const def of defs) {
    for (const fileType of def.fileTypes) lastParserFor.set(fileType, def.name);
  }
  return lastParserFor;
}

function unknownFileTypesError(
  pluginName: string,
  supported: readonly string[],
  fileTypes: readonly string[],
  hint = ' Use languageSettingsFor(name, fileTypes) to map one anyway.',
): Error {
  const list = fileTypes.map((type) => `"${type}"`).join(', ');
  const noun = fileTypes.length === 1 ? 'file type' : 'file types';
  return new Error(
    `No parser in plugin "${pluginName}" lists ${noun} ${list}. Supported file types: ${supported.join(', ') || '(none)'}.` +
      hint,
  );
}

function unknownParsersError(pluginName: string, defs: readonly ParserDef[], names: readonly string[]): Error {
  const list = names.map((name) => `"${name}"`).join(', ');
  const available = defs.map((def) => `"${def.name}"`).join(', ') || '(none)';
  const noun = names.length === 1 ? 'parser' : 'parsers';
  return new Error(`Unknown ${noun} ${list} in plugin "${pluginName}". Available parsers: ${available}.`);
}
