import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true, 'comment.line.doc': true } })],
  languageSettings: [
    {
      languageId: 'csharp',
      parser: 'strings-comments',
    },
  ],
};
