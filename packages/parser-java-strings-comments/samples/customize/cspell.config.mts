import { customizePlugin } from '@cspell/parser-java-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.block.doc': true } })],
  languageSettings: [
    {
      languageId: 'java',
      parser: 'java-strings-comments',
    },
  ],
};
