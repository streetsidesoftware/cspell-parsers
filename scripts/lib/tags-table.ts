import fs from 'node:fs/promises';
import Path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as prettier from 'prettier';

import { REPO_ROOT_DIR } from './consts.ts';

/** The `src/tags.ts` convention a package opts into by exporting `tagsAndMeaning` - see its own doc comment. */
export const TAGS_SOURCE_GLOB = 'packages/*/src/tags.ts';

/** Where the generated table for a given `src/tags.ts` lives, relative to that package's own root. */
export const TAGS_TABLE_RELATIVE_PATH = 'docs/tags-table.md';

interface TagsModule {
  tagsAndMeaning?: Readonly<Record<string, string>>;
}

/**
 * Dynamically imports `tagsTsFile` (a `src/tags.ts` matched by `TAGS_SOURCE_GLOB`) and returns its
 * `tagsAndMeaning` export, or `undefined` if the file doesn't export one - not every package has adopted
 * this convention yet, and that's fine; `tags.ts` files that don't export it are simply skipped rather than
 * treated as an error.
 */
export async function loadTagsAndMeaning(tagsTsFile: string): Promise<Readonly<Record<string, string>> | undefined> {
  const mod = (await import(pathToFileURL(tagsTsFile).href)) as TagsModule;
  return mod.tagsAndMeaning;
}

/**
 * Renders `tagsAndMeaning` as a GFM table matching `README.md`'s existing "Tags" section shape, formatted
 * through the repo's own prettier config (column-aligned, per `.prettierrc.json`'s `printWidth`) rather than
 * emitted unpadded. This has to happen here, not left for a later `prettier --write .` pass: `updateTagsTables`
 * decides whether a table needs regenerating by comparing this output against what's already on disk, and
 * that comparison is only meaningful if both sides go through the same formatting - otherwise a table that's
 * already prettier-formatted on disk would look like it "needs fixing" every single run.
 */
export async function renderTagsTable(tagsAndMeaning: Readonly<Record<string, string>>): Promise<string> {
  const rows = Object.entries(tagsAndMeaning).map(([tag, meaning]) => `| \`${tag}\` | ${meaning} |`);
  const table = ['| Tag | Meaning |', '| --- | --- |', ...rows, ''].join('\n');
  const config = await prettier.resolveConfig(REPO_ROOT_DIR);
  return prettier.format(table, { ...config, parser: 'markdown' });
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
 * Regenerates `docs/tags-table.md` for every package whose `src/tags.ts` exports `tagsAndMeaning`, so
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
    const rendered = await renderTagsTable(tagsAndMeaning);
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
