import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

// Check only PHPDoc comments.
const customPlugin = customizePlugin({ tags: { '*': false, 'comment.block.doc': true } });

export default {
  plugins: [customPlugin],
  languageSettings: customPlugin.languageSettings(),
};
