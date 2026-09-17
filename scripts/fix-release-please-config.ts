#!/usr/bin/env node

import Path from 'node:path';
import fs from 'node:fs/promises';

import { REPO_ROOT_DIR } from './lib/consts.ts';
import { RELEASE_PLEASE_CONFIG_FILE, updateReleasePleaseConfig } from './lib/release-please-utils.ts';

async function getPackageJsonFilenames() {
  const files: string[] = [];
  for await (const relFilePath of fs.glob('packages/parser*/package.json', { cwd: REPO_ROOT_DIR })) {
    files.push(Path.join(REPO_ROOT_DIR, relFilePath));
  }
  return files;
}

async function main() {
  const force = process.argv.includes('--force');
  const dryRun = !force && !process.argv.includes('--write');

  console.error(`Fixing ${RELEASE_PLEASE_CONFIG_FILE} files`);
  if (dryRun) {
    console.error('Running in dry run mode, no changes will be written. Use `--write`.');
  }

  const packageJsonFilenames = await getPackageJsonFilenames();
  await updateReleasePleaseConfig(packageJsonFilenames);

  console.error('Done.');
}

await main();
