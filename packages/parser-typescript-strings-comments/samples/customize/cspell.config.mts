import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';

// Check only doc comments.
export default customizePlugin({ tags: { '*': false, 'comment.block.doc': true } }).defineConfig();
