import { customizePlugin } from '@cspell/parser-csharp-strings-comments/plugin';

// Check only XML doc comments.
export default customizePlugin({ tags: { '*': false, 'comment.line.doc': true } }).defineConfig();
