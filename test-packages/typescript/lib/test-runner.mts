import assert from 'node:assert/strict';
import child_process from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const WITH_ISSUES_DIR = 'with-issues';
const WITH_ISSUES_CONFIG = `${WITH_ISSUES_DIR}/cspell.config.mts`;
const WITH_ISSUES_ACTUAL = `${WITH_ISSUES_DIR}/actual.snapshot.json`;
const WITH_ISSUES_SNAPSHOT = `${WITH_ISSUES_DIR}/snapshot.json`;

/**
 * Runs the full test suite for a single parser module, with `CSPELL_PARSER_TYPESCRIPT_MODULE` set to
 * `moduleName` so each test's `cspell.config.mts` loads that module's plugin/recommended export: the
 * "happy path" fixtures (which must produce zero issues) and the `with-issues` fixtures (deliberate,
 * known typos whose exact locations must match the checked-in snapshot on every backend).
 *
 * `cwd` is expected to be this package's `tests/` directory.
 */
export async function run(moduleName: string, cwd: string): Promise<void> {
  await runHappyPath(moduleName, cwd);
  await runWithIssues(moduleName, cwd);
}

async function runHappyPath(moduleName: string, cwd: string): Promise<void> {
  // The root cspell.config.yaml's `ignorePaths` excludes `with-issues` from this run (its fixtures
  // contain deliberate typos - see runWithIssues), so this is expected to find zero issues.
  await spawnCspell(['.', '--no-progress', '--no-color'], moduleName, cwd);
}

async function runWithIssues(moduleName: string, cwd: string): Promise<void> {
  // `--no-config-search -c <config>` bypasses the repo-level `ignorePaths` that exclude
  // `with-issues` from the happy-path run above. cspell will exit non-zero here since those typos
  // are real, expected findings - that's not a failure. The reporter.mjs configured in
  // WITH_ISSUES_CONFIG writes every issue it sees to WITH_ISSUES_ACTUAL, and pass/fail is decided
  // below by diffing that against the checked-in WITH_ISSUES_SNAPSHOT.
  await spawnCspell(
    ['--no-config-search', '-c', WITH_ISSUES_CONFIG, WITH_ISSUES_DIR, '--no-progress', '--no-color'],
    moduleName,
    cwd,
    { ignoreExitCode: true },
  );

  const actual = JSON.parse(await fs.readFile(path.join(cwd, WITH_ISSUES_ACTUAL), 'utf8'));
  const expected = JSON.parse(await fs.readFile(path.join(cwd, WITH_ISSUES_SNAPSHOT), 'utf8'));

  assert.deepStrictEqual(
    actual,
    expected,
    `known-issues snapshot mismatch for module "${moduleName}": ${WITH_ISSUES_ACTUAL} does not match ${WITH_ISSUES_SNAPSHOT}`,
  );
}

function spawnCspell(
  args: string[],
  moduleName: string,
  cwd: string,
  options: { ignoreExitCode?: boolean } = {},
): Promise<void> {
  const env = { ...process.env, CSPELL_PARSER_TYPESCRIPT_MODULE: moduleName };

  return new Promise<void>((resolve, reject) => {
    const child = child_process.spawn('pnpm', ['exec', 'cspell', ...args], {
      cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0 || options.ignoreExitCode) {
        resolve();
      } else {
        reject(new Error(`cspell failed for module "${moduleName}" (exit code ${code})`));
      }
    });
  });
}
