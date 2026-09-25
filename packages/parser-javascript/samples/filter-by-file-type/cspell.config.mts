import { customizePlugin } from '@cspell/parser-javascript/plugin';

// JSX files: check only comments.
// JavaScript files: keep the defaults.
export default customizePlugin().filterTags('javascriptreact', { '*': false, comment: true }).defineConfig();
