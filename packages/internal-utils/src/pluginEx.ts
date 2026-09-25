import type { ParserDefChanges } from './parserEx.ts';
import { ParserDef } from './parserEx.ts';
import type {
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
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  protected abstract get defs(): readonly ParserDef[];

  get parsers(): IParserEx[] {
    return this.defs.map((def) => def.parser);
  }

  parserNames(): string[] {
    return this.defs.map((def) => def.name);
  }

  customize(): IPluginBuilder {
    return new PluginBuilder(this.name, this.defs);
  }

  get supportedFileTypes(): string[] {
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
    const lastParserFor = new Map<string, string>();
    for (const def of this.defs) {
      for (const fileType of def.fileTypes) lastParserFor.set(fileType, def.name);
    }
    return this.defs
      .map((def) => ({ def, fileTypes: def.fileTypes.filter((fileType) => lastParserFor.get(fileType) === def.name) }))
      .filter(({ fileTypes }) => fileTypes.length)
      .map(({ def, fileTypes }) => ({ languageId: fileTypes.join(','), parser: def.name }));
  }

  languageSettingsFor(name: string, fileTypes?: readonly string[]): RecommendedLanguageSettings {
    const types = fileTypes ?? this.findDef(name).fileTypes;
    if (fileTypes) this.findDef(name);
    return types.length ? [{ languageId: types.join(','), parser: name }] : [];
  }

  protected findDef(name: string): ParserDef {
    const def = this.defs.find((d) => d.name === name);
    if (!def) throw unknownParsersError(this.name, this.defs, [name]);
    return def;
  }
}

class PluginEx extends PluginExQueries implements IPluginEx {
  readonly #defs: readonly ParserDef[];

  constructor(name: string, defs: readonly ParserDef[]) {
    super(name);
    this.#defs = Object.freeze([...defs]);
    Object.freeze(this);
  }

  protected get defs(): readonly ParserDef[] {
    return this.#defs;
  }
}

class PluginBuilder extends PluginExQueries implements IPluginBuilder {
  #defs: ParserDef[];

  constructor(name: string, defs: readonly ParserDef[]) {
    super(name);
    this.#defs = [...defs];
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
    const names = this.#resolve(target);
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
    const names = this.#resolve(target);
    this.#defs = this.#defs.map((def) => (names.has(def.name) ? def.with(change(def)) : def));
    return this;
  }

  /** Validates every name before anything changes. */
  #resolve(target: ParserTarget): Set<string> {
    if (target === '*') return new Set(this.#defs.map((def) => def.name));
    const names = typeof target === 'string' ? [target] : target;
    const unknown = names.filter((name) => !this.hasParser(name));
    if (unknown.length) throw unknownParsersError(this.name, this.#defs, unknown);
    return new Set(names);
  }
}

function assertNameIsFree(pluginName: string, defs: readonly ParserDef[], name: string): void {
  if (!name || name === '*') throw new Error(`Invalid parser name ${JSON.stringify(name)} in plugin "${pluginName}".`);
  if (defs.some((def) => def.name === name)) {
    throw new Error(`Parser name "${name}" is already used in plugin "${pluginName}".`);
  }
}

function unknownParsersError(pluginName: string, defs: readonly ParserDef[], names: readonly string[]): Error {
  const list = names.map((name) => `"${name}"`).join(', ');
  const available = defs.map((def) => `"${def.name}"`).join(', ') || '(none)';
  const noun = names.length === 1 ? 'parser' : 'parsers';
  return new Error(`Unknown ${noun} ${list} in plugin "${pluginName}". Available parsers: ${available}.`);
}
