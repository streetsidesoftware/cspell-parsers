import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

// Check only PHPDoc comments.
export default customizePlugin({ tags: { '*': false, 'comment.block.doc': true } }).defineConfig();
