import Path from 'node:path';
import process from 'node:process';
import packageJson from './package.json' with { type: 'json' };

import { run } from './lib/test-runner.mts';

function modulesToTest(): string[] {
  const setOfModules: Set<string> = new Set();

  for (let idx = process.argv.indexOf('--module'); idx !== -1; idx = process.argv.indexOf('--module', idx + 1)) {
    const moduleName = process.argv[idx + 1];
    if (moduleName) {
      setOfModules.add(moduleName);
    }
  }

  if (process.argv.includes('--all')) {
    const testPackages = Object.keys(packageJson.dependencies || {}).filter((dep) => dep.startsWith('@cspell/parser-'));
    testPackages.forEach((pkg) => setOfModules.add(pkg));
  }

  return [...setOfModules];
}

async function main() {
  console.error('Test Runner');

  const modules = modulesToTest();

  if (modules.length === 0) {
    console.error('No modules to test. Use --module <name> or --all.');
    process.exitCode = 1;
    return;
  }

  const failures: string[] = [];

  for (const moduleName of modules) {
    console.error(`Running tests for module: ${moduleName}`);
    try {
      await run(moduleName, Path.join(import.meta.dirname, 'tests'));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      failures.push(moduleName);
    }
  }

  if (failures.length > 0) {
    console.error(`Failed modules: ${failures.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.error('Done.');
}

main();
