import fs from 'node:fs/promises';
import Path from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT_DIR } from './consts.ts';

/** Glob for the `src/tags.ts` convention a package opts into by exporting `tagsAndMeaning`. */
export const TAGS_SOURCE_GLOB = 'packages/*/src/tags.ts';

/** Where the generated table for a given `src/tags.ts` lives, relative to that package's own root. */
export const TAGS_TABLE_RELATIVE_PATH = 'docs/tags-table.csv';

/** Glob for each package's built plugin, which the language ID table is generated from. */
export const PLUGIN_SOURCE_GLOB = 'packages/*/dist/plugin.js';

/** Where the generated language ID table lives, relative to a package's own root. */
export const LANGUAGE_ID_TABLE_RELATIVE_PATH = 'docs/language-id-n-parser-name.csv';

/** Glob for every package's `package.json`, which the root README's package table is generated from. */
export const PACKAGE_JSON_GLOB = 'packages/*/package.json';

/** Where the root README's generated package table lives, relative to the repo root. */
export const PACKAGES_TABLE_PATH = 'static/packages.csv';

interface TagsModule {
  tagsAndMeaning?: Readonly<Record<string, string>>;
}

interface ParserInfo {
  name: string;
  supportedFileTypes?: readonly string[];
}

interface PluginModule {
  plugin?: { parsers?: readonly ParserInfo[] };
}

export interface PackageInfo {
  name: string;
  description: string;
  /** The package's directory, relative to the generated table's directory. */
  dir: string;
}

/**
 * Imports `tagsTsFile`'s `tagsAndMeaning` export, or `undefined` if it doesn't export one (packages that
 * haven't adopted the convention are skipped, not an error).
 */
export async function loadTagsAndMeaning(tagsTsFile: string): Promise<Readonly<Record<string, string>> | undefined> {
  const mod = (await import(pathToFileURL(tagsTsFile).href)) as TagsModule;
  return mod.tagsAndMeaning;
}

/** Imports `pluginJsFile`'s `plugin.parsers`, or `undefined` if it has none. */
export async function loadPluginParsers(pluginJsFile: string): Promise<readonly ParserInfo[] | undefined> {
  const mod = (await import(pathToFileURL(pluginJsFile).href)) as PluginModule;
  const parsers = mod.plugin?.parsers;
  return parsers?.length ? parsers : undefined;
}

/** Quotes a CSV field per RFC 4180 if it contains a comma, double quote, or newline. */
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Renders `tagsAndMeaning` as a `Tag,Meaning` CSV, injected into `README.md` as a table by
 * `inject-markdown`'s `#markdown` option (see `updateTagsTables`), which renders each cell's content as
 * Markdown rather than escaping it - needed so the backtick-wrapped tag names and inline code in `Meaning`
 * render as code spans instead of literal text.
 */
export function renderTagsTable(tagsAndMeaning: Readonly<Record<string, string>>): string {
  const rows = Object.entries(tagsAndMeaning).map(([tag, meaning]) => `${csvField(`\`${tag}\``)},${csvField(meaning)}`);
  return ['Tag,Meaning', ...rows, ''].join('\n');
}

/**
 * Renders a `Language ID,Parser Name,Recommended` CSV with one row per (language ID, parser) pair, sorted by
 * language ID and then by the parser's index in `parsers` (its last index, if listed more than once). The last
 * parser for each language ID is marked `yes`, since the last one wins in cspell.
 */
export function renderLanguageIdTable(parsers: readonly ParserInfo[]): string {
  const pairsByKey = new Map<string, { languageId: string; parser: string; index: number }>();
  parsers.forEach((parser, index) => {
    for (const languageId of parser.supportedFileTypes ?? []) {
      pairsByKey.set(`${languageId}\0${parser.name}`, { languageId, parser: parser.name, index });
    }
  });
  const pairs = [...pairsByKey.values()];
  pairs.sort((a, b) => (a.languageId < b.languageId ? -1 : a.languageId > b.languageId ? 1 : a.index - b.index));

  const rows = pairs.map(({ languageId, parser }, i) => {
    const recommended = pairs[i + 1]?.languageId === languageId ? '' : 'yes';
    return [languageId, parser, recommended].map(csvField).join(',');
  });
  return ['Language ID,Parser Name,Recommended', ...rows, ''].join('\n');
}

/**
 * Renders a `Package,Description` CSV with one row per package, sorted by name. Injected with `#markdown`
 * (like {@link renderTagsTable}) so each package name renders as a link to its directory.
 */
export function renderPackagesTable(packages: readonly PackageInfo[]): string {
  const rows = [...packages]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map(({ name, description, dir }) => [`[\`${name}\`](${dir})`, description].map(csvField).join(','));
  return ['Package,Description', ...rows, ''].join('\n');
}

async function findFiles(pattern: string): Promise<string[]> {
  const files: string[] = [];
  for await (const relFilePath of fs.glob(pattern, { cwd: REPO_ROOT_DIR })) {
    files.push(Path.join(REPO_ROOT_DIR, relFilePath));
  }
  return files.sort();
}

async function readIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Writes `content` to `filePath` unless it's already up to date. @returns `true` if it needed updating. */
async function writeIfChanged(filePath: string, content: string, dryRun: boolean | undefined): Promise<boolean> {
  if ((await readIfExists(filePath)) === content) return false;

  const relFilePath = Path.relative(REPO_ROOT_DIR, filePath);
  if (dryRun) {
    console.error('Needs fixing: %s', relFilePath);
    return true;
  }
  await fs.mkdir(Path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
  console.error('Wrote: %s', relFilePath);
  return true;
}

export interface UpdateParserReadmeTablesOptions {
  dryRun?: boolean;
}

/**
 * Regenerates `docs/tags-table.csv` for every package whose `src/tags.ts` exports `tagsAndMeaning`, so
 * `README.md`'s Tags table (injected from that file via `inject-markdown` - see `pnpm run build:readme`) is
 * generated from the tag definitions in code rather than hand-copied from them.
 * @returns `true` if one or more tables needed updating, `false` if everything was already up to date.
 */
export async function updateTagsTables(options: UpdateParserReadmeTablesOptions = {}): Promise<boolean> {
  let needsFix = false;

  for (const tagsTsFile of await findFiles(TAGS_SOURCE_GLOB)) {
    const tagsAndMeaning = await loadTagsAndMeaning(tagsTsFile);
    if (!tagsAndMeaning) continue;

    const packageDir = Path.dirname(Path.dirname(tagsTsFile)); // src/tags.ts -> package root
    const tableFile = Path.join(packageDir, TAGS_TABLE_RELATIVE_PATH);
    needsFix = (await writeIfChanged(tableFile, renderTagsTable(tagsAndMeaning), options.dryRun)) || needsFix;
  }

  return needsFix;
}

/**
 * Regenerates `docs/language-id-n-parser-name.csv` for every package with a built `dist/plugin.js`, so
 * `README.md`'s Supported file types table is generated from the plugin's parsers.
 * @returns `true` if one or more tables needed updating, `false` if everything was already up to date.
 */
export async function updateLanguageIdTables(options: UpdateParserReadmeTablesOptions = {}): Promise<boolean> {
  let needsFix = false;

  for (const pluginJsFile of await findFiles(PLUGIN_SOURCE_GLOB)) {
    const parsers = await loadPluginParsers(pluginJsFile);
    if (!parsers) continue;

    const packageDir = Path.dirname(Path.dirname(pluginJsFile)); // dist/plugin.js -> package root
    const tableFile = Path.join(packageDir, LANGUAGE_ID_TABLE_RELATIVE_PATH);
    needsFix = (await writeIfChanged(tableFile, renderLanguageIdTable(parsers), options.dryRun)) || needsFix;
  }

  return needsFix;
}

/**
 * Regenerates `static/packages.csv` from every publishable (non-`private`) package's `package.json`, so the
 * root `README.md`'s Available parsers table stays in sync with `packages/*`.
 * @returns `true` if the table needed updating, `false` if it was already up to date.
 */
export async function updatePackagesTable(options: UpdateParserReadmeTablesOptions = {}): Promise<boolean> {
  const packages: PackageInfo[] = [];

  for (const packageJsonFile of await findFiles(PACKAGE_JSON_GLOB)) {
    const pkg = JSON.parse(await fs.readFile(packageJsonFile, 'utf-8')) as {
      name: string;
      description?: string;
      private?: boolean;
    };
    if (pkg.private) continue;

    // inject-markdown rebases links from the CSV's own directory, so link relative to it, not the repo root.
    const tableDir = Path.dirname(Path.join(REPO_ROOT_DIR, PACKAGES_TABLE_PATH));
    const dir = Path.relative(tableDir, Path.dirname(packageJsonFile)).split(Path.sep).join('/');
    packages.push({ name: pkg.name, description: pkg.description ?? '', dir });
  }

  return writeIfChanged(Path.join(REPO_ROOT_DIR, PACKAGES_TABLE_PATH), renderPackagesTable(packages), options.dryRun);
}

/** Runs every README table generator. @returns `true` if any table needed updating. */
export async function updateParserReadmeTables(options: UpdateParserReadmeTablesOptions = {}): Promise<boolean> {
  const tagsNeedFix = await updateTagsTables(options);
  const languageIdsNeedFix = await updateLanguageIdTables(options);
  const packagesNeedFix = await updatePackagesTable(options);
  return tagsNeedFix || languageIdsNeedFix || packagesNeedFix;
}
