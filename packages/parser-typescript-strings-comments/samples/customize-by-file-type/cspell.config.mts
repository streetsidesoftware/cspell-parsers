import { plugin } from '@cspell/parser-typescript-strings-comments/plugin';

// JavaScript files: check only comments.
// TypeScript files: keep the defaults.
export default plugin
  .customize()
  .duplicateParser('typescript-strings-comments', 'js-comments-only')
  .setFileTypes('js-comments-only', ['javascript', 'javascriptreact'])
  .filterTags('js-comments-only', { '*': false, comment: true })
  .defineConfig();
