#!/usr/bin/env node

import Path from 'node:path';
import fs from 'node:fs/promises';

import { fixPackageJson } from './lib/package-json-util.ts';
import { REPO_ROOT_DIR } from './lib/consts.ts';

const HELP = `Usage: fix-package-json [options]

Fixes up packages/*/package.json files (name, repository, keywords, publishConfig).

Options:
  --dry-run   Report which files need fixing without writing changes; exits with a
              non-zero status if any file needs fixing.
  -h, --help  Show this help message.
`;

async function main() {
  if (process.argv.includes('-h') || process.argv.includes('--help')) {
    console.log(HELP);
    return;
  }

  const dryRun = process.argv.includes('--dry-run');

  console.error('Fixing package.json files...');
  if (dryRun) {
    console.error('Running in dry run mode, no changes will be written.');
  }

  let needsFix = false;
  for await (const relFilePath of fs.glob('packages/*/package.json', { cwd: REPO_ROOT_DIR })) {
    const fixed = await fixPackageJson(Path.join(REPO_ROOT_DIR, relFilePath), { dryRun });
    needsFix ||= fixed;
  }

  if (dryRun && needsFix) {
    console.error('One or more package.json files need fixing. Run `pnpm exec fix-package-json` to fix them.');
    process.exitCode = 1;
    return;
  }

  console.error('Done.');
}

await main();
