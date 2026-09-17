import Path from 'node:path';

const __dirname = import.meta.dirname;

export const REPO_ROOT_DIR = Path.resolve(__dirname, '../../');

export const REPOSITORY_URL = 'https://github.com/streetsidesoftware/cspell-parsers.git';
export const REPOSITORY_GIT_URL = 'git+' + REPOSITORY_URL;
