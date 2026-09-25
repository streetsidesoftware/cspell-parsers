import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';

// Check only doc comments.
export default customizePlugin({ tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true } }).defineConfig();
