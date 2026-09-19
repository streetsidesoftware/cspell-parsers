import { plugin } from '@cspell/parser-rust-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'rust',
      parser: 'rust-strings-comments',
    },
  ],
};
