import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';

// JavaScript and JSX files: check only comments.
// TypeScript files: keep the defaults.
export default customizePlugin().filterTags('javascript-strings-comments', { '*': false, comment: true }).defineConfig();
