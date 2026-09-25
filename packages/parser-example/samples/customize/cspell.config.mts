import { customizePlugin } from '@cspell/parser-example/plugin';

// Check only doc comments.
export default customizePlugin({ tags: { '*': false, 'comment.block.doc': true } }).defineConfig();
