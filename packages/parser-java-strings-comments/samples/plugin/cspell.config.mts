import { plugin } from '@cspell/parser-java-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'java',
      parser: 'java-strings-comments',
    },
  ],
};
