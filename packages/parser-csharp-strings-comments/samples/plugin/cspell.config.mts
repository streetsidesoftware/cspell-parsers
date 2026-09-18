import { plugin } from '@cspell/parser-csharp-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'csharp',
      parser: 'csharp-strings-comments',
    },
  ],
};
