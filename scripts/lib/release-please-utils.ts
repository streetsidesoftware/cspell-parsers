import fs from 'node:fs/promises';
import Path from 'node:path';

import { REPO_ROOT_DIR } from './consts.ts';
import { readPackageJson } from './package-json-util.ts';

export const RELEASE_PLEASE_CONFIG_FILE = 'release-please-config.json';

export interface ReleasePleaseConfigPackage {
  component: string;
}

export interface ReleasePleaseConfig {
  'include-v-in-tag'?: boolean;
  'tag-separator'?: string;
  packages: Record<string, ReleasePleaseConfigPackage>;
}

export async function readReleasePleaseConfig(): Promise<ReleasePleaseConfig> {
  const configPath = Path.resolve(REPO_ROOT_DIR, RELEASE_PLEASE_CONFIG_FILE);
  const config = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(config) as ReleasePleaseConfig;
}

export async function writeReleasePleaseConfig(config: ReleasePleaseConfig): Promise<void> {
  const configPath = Path.resolve(REPO_ROOT_DIR, RELEASE_PLEASE_CONFIG_FILE);
  const configString = JSON.stringify(config, null, 2) + '\n';
  await fs.writeFile(configPath, configString, 'utf-8');
}

export interface UpdateReleasePleaseConfigOptions {
  dryRun?: boolean;
}

/**
 * Updates release-please-config.json from the given package.json files, optionally writing the
 * result back to disk.
 * @returns `true` if the config needed updating, `false` if it was already correct.
 */
export async function updateReleasePleaseConfig(
  packageFiles: string[],
  options: UpdateReleasePleaseConfigOptions = {},
): Promise<boolean> {
  const { dryRun } = options;
  const configPath = Path.resolve(REPO_ROOT_DIR, RELEASE_PLEASE_CONFIG_FILE);
  const orig = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(orig) as ReleasePleaseConfig;
  const packages = config.packages || {};
  for (const packageFile of packageFiles) {
    const packageJsonFile = Path.resolve(REPO_ROOT_DIR, packageFile);
    const packageJson = await readPackageJson(packageJsonFile);
    const packageJsonDir = Path.relative(REPO_ROOT_DIR, Path.dirname(packageJsonFile));
    const name = packageJson.name;
    if (!name || name.startsWith('@internal')) continue;
    const packageDir = packageJsonDir.replaceAll('\\', '/');
    packages[packageDir] = { component: name };
  }
  config.packages = Object.fromEntries(Object.entries(packages).sort(([a], [b]) => a.localeCompare(b)));
  const result = JSON.stringify(config, null, 2) + '\n';
  const needsFix = orig !== result;

  if (!needsFix) {
    return false;
  }

  if (dryRun) {
    console.error('Dry run enabled, not writing changes to: %s', RELEASE_PLEASE_CONFIG_FILE);
    return true;
  }

  await fs.writeFile(configPath, result, 'utf-8');
  return true;
}
