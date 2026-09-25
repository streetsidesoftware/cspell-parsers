import { plugin } from '@cspell/parser-typescript-strings-comments/plugin';

// JavaScript files: check only comments.
// TypeScript files: keep the defaults.
const customPlugin = plugin
  .customize()
  .duplicateParser('typescript-strings-comments', 'js-comments-only')
  .setFileTypes('js-comments-only', ['javascript', 'javascriptreact'])
  .filterTags('js-comments-only', { '*': false, comment: true });

export default {
  plugins: [customPlugin],
  languageSettings: customPlugin.languageSettings(),
};
