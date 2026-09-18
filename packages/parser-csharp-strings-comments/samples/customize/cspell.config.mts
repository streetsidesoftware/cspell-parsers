import { customizePlugin } from '@cspell/parser-csharp-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.line.doc': true } })],
  languageSettings: [
    {
      languageId: 'csharp',
      parser: 'csharp-strings-comments',
    },
  ],
};
