#!/usr/bin/env node

import Path from 'node:path';
import fs from 'node:fs/promises';

import { REPO_ROOT_DIR } from './lib/consts.ts';
import { RELEASE_PLEASE_CONFIG_FILE, updateReleasePleaseConfig } from './lib/release-please-utils.ts';

const HELP = `Usage: fix-release-please-config [options]

Updates ${RELEASE_PLEASE_CONFIG_FILE}'s packages map from packages/parser*/package.json.

Options:
  --dry-run   Report whether the config needs fixing without writing changes; exits
              with a non-zero status if it needs fixing.
  -h, --help  Show this help message.
`;

async function getPackageJsonFilenames() {
  const files: string[] = [];
  for await (const relFilePath of fs.glob('packages/parser*/package.json', { cwd: REPO_ROOT_DIR })) {
    files.push(Path.join(REPO_ROOT_DIR, relFilePath));
  }
  return files;
}

async function main() {
  if (process.argv.includes('-h') || process.argv.includes('--help')) {
    console.log(HELP);
    return;
  }

  const dryRun = process.argv.includes('--dry-run');

  console.error(`Fixing ${RELEASE_PLEASE_CONFIG_FILE}...`);
  if (dryRun) {
    console.error('Running in dry run mode, no changes will be written.');
  }

  const packageJsonFilenames = await getPackageJsonFilenames();
  const needsFix = await updateReleasePleaseConfig(packageJsonFilenames, { dryRun });

  if (dryRun && needsFix) {
    console.error(`${RELEASE_PLEASE_CONFIG_FILE} needs fixing. Run \`pnpm exec fix-release-please-config\` to fix it.`);
    process.exitCode = 1;
    return;
  }

  console.error('Done.');
}

await main();
