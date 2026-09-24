#!/usr/bin/env node

import {
  LANGUAGE_ID_TABLE_RELATIVE_PATH,
  PACKAGE_JSON_GLOB,
  PACKAGES_TABLE_PATH,
  PLUGIN_SOURCE_GLOB,
  TAGS_SOURCE_GLOB,
  TAGS_TABLE_RELATIVE_PATH,
  updateParserReadmeTables,
} from './lib/parser-readme.ts';

const HELP = `Usage: fix-parser-readme [options]

Regenerates the CSV tables each package's README.md injects:

- ${TAGS_TABLE_RELATIVE_PATH} from its \`${TAGS_SOURCE_GLOB}\`'s \`tagsAndMeaning\` export (packages that
  don't export one are skipped).
- ${LANGUAGE_ID_TABLE_RELATIVE_PATH} from its \`${PLUGIN_SOURCE_GLOB}\`'s \`plugin.parsers\` (run
  \`pnpm run build\` first; packages without one are skipped).

And the one the root README.md injects:

- ${PACKAGES_TABLE_PATH} from every non-private \`${PACKAGE_JSON_GLOB}\`'s \`name\`, plus the languages and
  top-level tags of its built \`dist/plugin.js\` (run \`pnpm run build\` first; packages without one are
  skipped).

Run \`pnpm run build:readme\` afterward to inject the results into the READMEs.

Options:
  --dry-run   Report which tables need regenerating without writing changes; exits with a
              non-zero status if any table needs regenerating.
  -h, --help  Show this help message.
`;

async function main() {
  if (process.argv.includes('-h') || process.argv.includes('--help')) {
    console.log(HELP);
    return;
  }

  const dryRun = process.argv.includes('--dry-run');

  console.error('Regenerating parser README tables...');
  if (dryRun) {
    console.error('Running in dry run mode, no changes will be written.');
  }

  const needsFix = await updateParserReadmeTables({ dryRun });

  if (dryRun && needsFix) {
    console.error('One or more README tables need regenerating. Run `pnpm exec fix-parser-readme` to fix them.');
    process.exitCode = 1;
    return;
  }

  console.error('Done.');
}

await main();
