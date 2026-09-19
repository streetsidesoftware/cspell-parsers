import { customizePlugin } from '@cspell/parser-c-cpp-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true } })],
  languageSettings: [
    {
      languageId: 'cpp',
      parser: 'c-cpp-strings-comments',
    },
  ],
};
