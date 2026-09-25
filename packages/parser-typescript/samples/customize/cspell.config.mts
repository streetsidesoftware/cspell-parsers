import { customizePlugin } from '@cspell/parser-typescript/plugin';

// Check only line comments and doc comments.
export default customizePlugin({
  tags: { '*': false, comment: true, 'comment.block': false, 'comment.block.doc': true },
}).defineConfig();
