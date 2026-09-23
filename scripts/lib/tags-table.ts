import fs from 'node:fs/promises';
import Path from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT_DIR } from './consts.ts';

/** Glob for the `src/tags.ts` convention a package opts into by exporting `tagsAndMeaning`. */
export const TAGS_SOURCE_GLOB = 'packages/*/src/tags.ts';

/** Where the generated table for a given `src/tags.ts` lives, relative to that package's own root. */
export const TAGS_TABLE_RELATIVE_PATH = 'docs/tags-table.csv';

interface TagsModule {
  tagsAndMeaning?: Readonly<Record<string, string>>;
}

/**
 * Imports `tagsTsFile`'s `tagsAndMeaning` export, or `undefined` if it doesn't export one (packages that
 * haven't adopted the convention are skipped, not an error).
 */
export async function loadTagsAndMeaning(tagsTsFile: string): Promise<Readonly<Record<string, string>> | undefined> {
  const mod = (await import(pathToFileURL(tagsTsFile).href)) as TagsModule;
  return mod.tagsAndMeaning;
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

async function findTagsSourceFiles(): Promise<string[]> {
  const files: string[] = [];
  for await (const relFilePath of fs.glob(TAGS_SOURCE_GLOB, { cwd: REPO_ROOT_DIR })) {
    files.push(Path.join(REPO_ROOT_DIR, relFilePath));
  }
  return files;
}

async function readIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export interface UpdateTagsTablesOptions {
  dryRun?: boolean;
}

/**
 * Regenerates `docs/tags-table.csv` for every package whose `src/tags.ts` exports `tagsAndMeaning`, so
 * `README.md`'s Tags table (injected from that file via `inject-markdown` - see `pnpm run build:readme`) is
 * generated from the tag definitions in code rather than hand-copied from them.
 * @returns `true` if one or more tables needed updating, `false` if everything was already up to date.
 */
export async function updateTagsTables(options: UpdateTagsTablesOptions = {}): Promise<boolean> {
  const { dryRun } = options;
  let needsFix = false;

  for (const tagsTsFile of await findTagsSourceFiles()) {
    const tagsAndMeaning = await loadTagsAndMeaning(tagsTsFile);
    if (!tagsAndMeaning) continue;

    const packageDir = Path.dirname(Path.dirname(tagsTsFile)); // src/tags.ts -> package root
    const tableFile = Path.join(packageDir, TAGS_TABLE_RELATIVE_PATH);
    const rendered = renderTagsTable(tagsAndMeaning);
    const existing = await readIfExists(tableFile);
    if (existing === rendered) continue;

    needsFix = true;
    const relTableFile = Path.relative(REPO_ROOT_DIR, tableFile);
    if (dryRun) {
      console.error('Needs fixing: %s', relTableFile);
      continue;
    }
    await fs.mkdir(Path.dirname(tableFile), { recursive: true });
    await fs.writeFile(tableFile, rendered, 'utf-8');
    console.error('Wrote: %s', relTableFile);
  }

  return needsFix;
}
