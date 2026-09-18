import { plugin } from '@cspell/parser-go-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'go',
      parser: 'go-strings-comments',
    },
  ],
};
