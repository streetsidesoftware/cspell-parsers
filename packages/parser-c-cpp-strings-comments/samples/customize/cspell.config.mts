import { customizePlugin } from '@cspell/parser-c-cpp-strings-comments/plugin';

// C++ files: check only Doxygen doc comments.
// C files: keep the defaults.
export default customizePlugin()
  .filterTagsForFileType('cpp', { '*': false, 'comment.line.doc': true, 'comment.block.doc': true }, 'cpp-doc-comments')
  .defineConfig();
