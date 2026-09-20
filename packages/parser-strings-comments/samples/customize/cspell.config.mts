import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

const plugin = customizePlugin('csharp', { name: 'csharp-strings-comments', tags: { '*': false, 'comment.block.doc': true, 'comment.line.doc': true } });

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'csharp',
      parser: 'csharp-strings-comments-xxx',
    },
  ],
};
