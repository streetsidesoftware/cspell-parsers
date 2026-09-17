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
  console.error(`Fixing ${RELEASE_PLEASE_CONFIG_FILE} files`);

  const packageJsonFilenames = await getPackageJsonFilenames();
  await updateReleasePleaseConfig(packageJsonFilenames);

  console.error('Done.');
}

await main();
