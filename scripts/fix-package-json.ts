#!/usr/bin/env node

import Path from 'node:path';
import fs from 'node:fs/promises';

import { fixPackageJson } from './lib/package-json-util.ts';
import { REPO_ROOT_DIR } from './lib/consts.ts';

async function main() {
  const force = process.argv.includes('--force');
  const dryRun = !force && !process.argv.includes('--write');

  console.error('Fixing package.json files...');
  if (dryRun) {
    console.error('Running in dry run mode, no changes will be written. Use `--write`.');
  }

  for await (const relFilePath of fs.glob('packages/parser*/package.json', { cwd: REPO_ROOT_DIR })) {
    await fixPackageJson(Path.join(REPO_ROOT_DIR, relFilePath), { dryRun, force });
  }

  console.error('Done.');
}

await main();
