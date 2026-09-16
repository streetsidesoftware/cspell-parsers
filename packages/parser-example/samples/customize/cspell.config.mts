import { customizePlugin } from '@cspell/parser-example/plugin';

export default {
  plugins: [customizePlugin({ '*': false, 'comment.block.doc': true })],
  languageSettings: [
    {
      languageId: 'c',
      parser: 'c-style-comments',
    },
  ],
};
