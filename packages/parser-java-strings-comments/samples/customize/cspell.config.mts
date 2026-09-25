import { customizePlugin } from '@cspell/parser-java-strings-comments/plugin';

// Check only Javadoc comments.
export default customizePlugin({ tags: { '*': false, 'comment.block.doc': true } }).defineConfig();
