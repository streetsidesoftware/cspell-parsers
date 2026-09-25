import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';

// JavaScript and JSX files: check only comments.
// TypeScript files: keep the defaults.
export default customizePlugin()
  .filterTagsForFileType('javascript', { '*': false, comment: true }, 'js-comments-only')
  .filterTagsForFileType('javascriptreact', { '*': false, comment: true }, 'jsx-comments-only')
  .defineConfig();
