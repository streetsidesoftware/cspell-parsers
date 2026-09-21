#!/usr/bin/env node

import { TAGS_SOURCE_GLOB, TAGS_TABLE_RELATIVE_PATH, updateTagsTables } from './lib/tags-table.ts';

const HELP = `Usage: fix-tags-readme [options]

Regenerates each package's ${TAGS_TABLE_RELATIVE_PATH} from its \`${TAGS_SOURCE_GLOB}\`'s \`tagsAndMeaning\`
export (packages that don't export one are skipped). Run \`pnpm run build:readme\` afterward to inject the
result into README.md.

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

  console.error('Regenerating tags README tables...');
  if (dryRun) {
    console.error('Running in dry run mode, no changes will be written.');
  }

  const needsFix = await updateTagsTables({ dryRun });

  if (dryRun && needsFix) {
    console.error('One or more tags tables need regenerating. Run `pnpm exec fix-tags-readme` to fix them.');
    process.exitCode = 1;
    return;
  }

  console.error('Done.');
}

await main();
