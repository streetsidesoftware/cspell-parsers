#!/usr/bin/env node

import Path from 'node:path';
import fs from 'node:fs/promises';

import { fixPackageJson } from './lib/package-json-util.ts';
import { REPO_ROOT_DIR } from './lib/consts.ts';

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.error('Fixing package.json files...');
  if (dryRun) {
    console.error('Running in dry run mode, no changes will be written.');
  }

  for await (const relFilePath of fs.glob('packages/*/package.json', { cwd: REPO_ROOT_DIR })) {
    await fixPackageJson(Path.join(REPO_ROOT_DIR, relFilePath), { dryRun });
  }

  console.error('Done.');
}

await main();
