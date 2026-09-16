import { customizePlugin, supportedFileTypes } from '@cspell/parser-javascript/plugin';

export default {
  plugins: [
    customizePlugin({ tags: { '*': false, comment: true, 'comment.block': false, 'comment.block.doc': true } }),
  ],
  languageSettings: [
    {
      languageId: supportedFileTypes,
      parser: 'javascript',
    },
  ],
};
