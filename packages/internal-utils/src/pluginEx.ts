import type { ParserDefChanges } from './parserEx.ts';
import { ParserDef } from './parserEx.ts';
import type {
  CustomizeParserOptions,
  CustomizePluginExOptions,
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
  /** Parser names must be unique. */
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

/** The read-only queries, over an ordered list of parser definitions. */
abstract class PluginExQueries implements IPluginExBase {
  abstract get name(): string;
  protected abstract get defs(): readonly ParserDef[];

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

  /** Validates every name before anything changes. */
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
}

class PluginBuilder extends PluginExQueries implements IPluginBuilder {
  #name: string;
  /** An array, not a Map: order picks the recommended parser, and a rename must keep its position. */
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

  build(): IPluginEx {
    return new PluginEx(this.name, this.#defs);
  }

  #update(target: ParserTarget, change: (def: ParserDef) => ParserDefChanges): this {
    const names = this.resolveTarget(target);
    this.#defs = this.#defs.map((def) => (names.has(def.name) ? def.with(change(def)) : def));
    return this;
  }
}

/**
 * Implements a package's `customizePlugin`: `tags` apply to every parser, and the deprecated `name` renames the
 * plugin's only parser. See docs/ADRs/plugin-customization/0008-customize-plugin-wrapper.md.
 */
export function customizePluginEx(
  plugin: IPluginEx,
  options?: CustomizePluginExOptions | CustomizeParserOptions,
): IPluginBuilder {
  const builder = plugin.customize();
  if (options?.name) {
    const names = builder.parserNames();
    if (names.length !== 1) {
      throw new Error(
        `"name" only works for a plugin with one parser; use renameParser instead (plugin "${plugin.name}").`,
      );
    }
    builder.renameParser(names[0] ?? '', options.name);
  }
  if (options?.tags) builder.filterTags('*', options.tags);
  return builder;
}

/** Implements a package's deprecated `createParser`: a renamed and/or re-filtered copy of `parser`. */
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

function unknownFileTypesError(pluginName: string, supported: readonly string[], fileTypes: readonly string[]): Error {
  const list = fileTypes.map((type) => `"${type}"`).join(', ');
  const noun = fileTypes.length === 1 ? 'file type' : 'file types';
  return new Error(
    `No parser in plugin "${pluginName}" lists ${noun} ${list}. Supported file types: ${supported.join(', ') || '(none)'}. ` +
      'Use languageSettingsFor(name, fileTypes) to map one anyway.',
  );
}

function unknownParsersError(pluginName: string, defs: readonly ParserDef[], names: readonly string[]): Error {
  const list = names.map((name) => `"${name}"`).join(', ');
  const available = defs.map((def) => `"${def.name}"`).join(', ') || '(none)';
  const noun = names.length === 1 ? 'parser' : 'parsers';
  return new Error(`Unknown ${noun} ${list} in plugin "${pluginName}". Available parsers: ${available}.`);
}
