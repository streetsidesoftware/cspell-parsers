import { plugin } from '@cspell/parser-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'php',
      parser: 'strings-comments',
    },
  ],
};
