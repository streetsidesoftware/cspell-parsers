import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';

// TypeScript files: check only doc comments.
// Other files: keep the defaults.
export default customizePlugin()
  .filterTagsForFileType('typescript', { '*': false, 'comment.block.doc': true }, 'ts-doc-comments')
  .defineConfig();
