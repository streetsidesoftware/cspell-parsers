import { customizePlugin } from '@cspell/parser-rust-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, 'comment.line.doc': true, 'comment.block.doc': true } })],
  languageSettings: [
    {
      languageId: 'rust',
      parser: 'rust-strings-comments',
    },
  ],
};
