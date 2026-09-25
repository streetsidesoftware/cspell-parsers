import { customizePlugin } from '@cspell/parser-go-strings-comments/plugin';

// Also check code, such as identifiers and keywords.
export default customizePlugin({ tags: { code: true } }).defineConfig();
