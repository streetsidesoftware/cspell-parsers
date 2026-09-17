import child_process from 'node:child_process';

/**
 * Runs `cspell` against the shared `tests` fixtures with `CSPELL_PARSER_TYPESCRIPT_MODULE` set to
 * `moduleName`, so each test's `cspell.config.mts` loads that module's plugin/recommended export.
 */
export async function run(moduleName: string, cwd: string): Promise<void> {
  const env = { ...process.env, CSPELL_PARSER_TYPESCRIPT_MODULE: moduleName };

  await new Promise<void>((resolve, reject) => {
    const child = child_process.spawn('pnpm', ['exec', 'cspell', '.', '--no-progress', '--no-color'], {
      cwd,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`cspell failed for module "${moduleName}" (exit code ${code})`));
      }
    });
  });
}
