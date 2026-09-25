import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

// C# files: check only doc comments.
// Other languages: keep the defaults.
export default customizePlugin()
  .filterTagsForFileType('csharp', { '*': false, 'comment.block.doc': true, 'comment.line.doc': true }, 'csharp-doc-comments')
  .defineConfig();
