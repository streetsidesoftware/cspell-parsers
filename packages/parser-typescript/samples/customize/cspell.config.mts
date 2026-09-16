import { customizePlugin } from '@cspell/parser-typescript/plugin';

export default {
  plugins: [customizePlugin({ '*': false, comment: true, 'comment.block': false, 'comment.block.doc': true })],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript',
    },
  ],
};
