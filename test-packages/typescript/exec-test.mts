import process from 'node:process';

import { run } from './lib/test-runner.mts';
import packageJson from './package.json' with { type: 'json' };

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
  const update = process.argv.includes('--update');

  if (modules.length === 0) {
    console.error('No modules to test. Use --module <name> or --all.');
    process.exitCode = 1;
    return;
  }

  modules.forEach((moduleName) => console.error(`Running tests for module: ${moduleName}`));

  const results = await Promise.allSettled(modules.map((moduleName) => run(moduleName, process.cwd(), { update })));

  const failures = modules.filter((_, index) => results[index].status === 'rejected');

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(result.reason instanceof Error ? result.reason.message : result.reason);
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
