import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

// Check only comments, in every language.
export default customizePlugin({ tags: { '*': false, comment: true } }).defineConfig();
