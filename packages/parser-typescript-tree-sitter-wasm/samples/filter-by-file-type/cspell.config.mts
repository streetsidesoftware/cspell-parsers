import { customizePlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';

// JavaScript files: check only comments.
// Other files: keep the defaults.
export default customizePlugin().filterTags('javascript', { '*': false, comment: true }).defineConfig();
