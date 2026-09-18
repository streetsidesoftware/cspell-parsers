import { plugin } from '@cspell/parser-php-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'php',
      parser: 'php-strings-comments',
    },
  ],
};
