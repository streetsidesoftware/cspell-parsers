import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

// Also check code, such as identifiers and keywords, in every language.
export default customizePlugin({ tags: { code: true } }).defineConfig();
