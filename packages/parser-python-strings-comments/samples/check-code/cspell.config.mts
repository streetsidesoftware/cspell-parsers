import { customizePlugin } from '@cspell/parser-python-strings-comments/plugin';

// Also check code, such as identifiers and keywords.
export default customizePlugin({ tags: { code: true } }).defineConfig();
