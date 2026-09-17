import Path from 'node:path';
import fs from 'node:fs/promises';
import sortPackageJson from 'sort-package-json';
import { REPO_ROOT_DIR, REPOSITORY_GIT_URL } from './consts.ts';

const PUBLISH_CONFIG: PackageJsonPublishConfig = {
  access: 'public',
  provenance: true,
};

export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  engines?: Record<string, string>;
  scripts?: Record<string, string>;
  keywords?: string[];
  repository?: PackageJsonRepository;
  publishConfig?: PackageJsonPublishConfig;
  funding?: string;
  [key: string]: unknown;
}

export interface PackageJsonRepository {
  type?: string;
  url?: string;
  directory?: string;
  [key: string]: unknown;
}

export interface PackageJsonPublishConfig {
  access?: 'public' | 'restricted';
  provenance?: boolean;
}

export function readPackageJson(filePath: string): Promise<PackageJson> {
  return fs.readFile(filePath, 'utf-8').then(JSON.parse);
}

export function formatPackageJson(packageJson: PackageJson): string {
  return JSON.stringify(sortPackageJson(packageJson), null, 2);
}

export function writePackageJson(filePath: string, data: PackageJson): Promise<void> {
  return fs.writeFile(filePath, formatPackageJson(data), 'utf-8');
}

export function setPackageRepository(packageJson: PackageJson, filePath: string) {
  const directory = Path.relative(REPO_ROOT_DIR, filePath);
  packageJson.repository = {
    type: 'git',
    url: REPOSITORY_GIT_URL,
    directory,
  };
}

export function fixUpPackageJson(packageJson: PackageJson, filePath: string) {
  setPackageRepository(packageJson, filePath);
  packageJson.publishConfig = PUBLISH_CONFIG;
}

export async function fixPackageJson(filePath: string, dryRun: boolean): Promise<void> {
  const relPath = Path.relative(REPO_ROOT_DIR, filePath);
  console.error('Fixing package.json for: %s', relPath);
  const packageJson = await readPackageJson(filePath);
  const orig = JSON.stringify(packageJson, null, 2);
  fixUpPackageJson(packageJson, filePath);
  const result = formatPackageJson(packageJson);

  if (orig === result) {
    console.error('No changes needed for: %s', relPath);
    return;
  }

  if (dryRun) {
    console.error('Dry run enabled, not writing changes for: %s', relPath);
    return;
  }

  return await fs.writeFile(filePath, result, 'utf-8');
}
