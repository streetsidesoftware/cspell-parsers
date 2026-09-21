import assert from 'node:assert/strict';
import child_process from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface RunOptions {
  /** Promote each suite's actual results to be the new checked-in snapshot instead of checking them. */
  update?: boolean;
}

/**
 * Runs cspell over the whole `tests` folder for a single parser module, with
 * `CSPELL_PARSER_TYPESCRIPT_MODULE` set to `moduleName` so each subfolder's own `cspell.config.mts`
 * loads that module's plugin/recommended export - cspell resolves the nearest config per file, so
 * `plugin`, `recommended`, `customize`, and `with-issues` are all covered by this single invocation.
 *
 * `lib/reporter.mts` (wired up in `tests/cspell.config.mts`) captures the issues cspell reports into
 * `__snapshots/<moduleName>.tests.actual.json` - prefixed per module so concurrent `run()` calls for
 * different modules (see exec-test.mts, which runs all of them in parallel) don't clobber each other's
 * output - which is then compared against - or, with `options.update`, copied over - the checked-in
 * `__snapshots/tests.json` (shared, since every module is expected to produce the same result).
 * Pass/fail always comes from that comparison, never from cspell's own exit code, since `with-issues`
 * is expected to report real issues and a plain "issues found" exit code can't tell that apart from a
 * regression.
 *
 * `cwd` is expected to be this package's root directory (the parent of both `tests/` and `__snapshots/`).
 */
export async function run(moduleName: string, cwd: string, options: RunOptions = {}): Promise<void> {
  await runSuite(moduleName, 'tests', cwd, options);
}

async function runSuite(moduleName: string, suite: string, cwd: string, options: RunOptions): Promise<void> {
  const moduleNamePrefix = moduleName.replaceAll(/[^\w]/g, '_');
  const actualFile = path.join(cwd, '__snapshots', `${moduleNamePrefix}.${suite}.actual.json`);
  const snapshotFile = path.join(cwd, '__snapshots', `${suite}.json`);

  await spawnCspell('.', moduleName, path.join(cwd, suite), actualFile);

  const actual = JSON.parse(await fs.readFile(actualFile, 'utf8'));

  if (options.update) {
    await fs.mkdir(path.dirname(snapshotFile), { recursive: true });
    await fs.writeFile(snapshotFile, JSON.stringify(actual, null, 2) + '\n');
    console.error(`Updated snapshot: __snapshots/${suite}.json`);
    await fs.rm(actualFile, { force: true });
    return;
  }

  let expectedText: string;
  try {
    expectedText = await fs.readFile(snapshotFile, 'utf8');
  } catch {
    throw new Error(
      `No snapshot found for suite "${suite}" (__snapshots/${suite}.json). Run with --update to create it.`,
    );
  }

  // On mismatch, actualFile is left in place (rather than cleaned up below) so it can be inspected
  // or diffed by hand - the AssertionError below already reports the diff too, but this makes the
  // full actual output easy to get at directly.
  assert.deepStrictEqual(
    actual,
    JSON.parse(expectedText),
    `snapshot mismatch for module "${moduleName}", suite "${suite}": ${path.relative(cwd, actualFile)} does not match __snapshots/${suite}.json (run with --update to accept)`,
  );

  await fs.rm(actualFile, { force: true });
}

function spawnCspell(target: string, moduleName: string, cwd: string, actualFile: string): Promise<void> {
  const env = {
    ...process.env,
    CSPELL_PARSER_TYPESCRIPT_MODULE: moduleName,
    CSPELL_SNAPSHOT_OUT: actualFile,
  };

  // Running with `cwd` set to the `tests` folder itself means config search starts there and finds
  // `tests/cspell.config.mts` first, rather than climbing past it to this package's own
  // cspell.config.yaml (which ignores `tests/with-issues` - that's for the repo-wide `pnpm spell`
  // check, not for this). cspell's own exit code isn't checked here - `with-issues` always reports
  // real issues, so pass/fail is decided by the snapshot diff in runSuite instead.
  const args = ['exec', 'cspell', target, '--no-progress', '--no-color'];

  return new Promise<void>((resolve, reject) => {
    // pnpm resolves to a .cmd shim on Windows, which per Node's docs can't be launched via spawn()/execFile()
    // without a shell. Rather than `shell: true` (deprecated as DEP0190 when combined with an args array,
    // since the args get shell-concatenated without escaping), spawn cmd.exe directly and pass the command
    // as its own args array - Node still escapes each argument properly since `shell` is unset here.
    const child =
      process.platform === 'win32'
        ? child_process.spawn('cmd.exe', ['/d', '/s', '/c', 'pnpm', ...args], { cwd, env, stdio: 'inherit' })
        : child_process.spawn('pnpm', args, { cwd, env, stdio: 'inherit' });

    child.on('error', reject);
    child.on('exit', () => resolve());
  });
}
