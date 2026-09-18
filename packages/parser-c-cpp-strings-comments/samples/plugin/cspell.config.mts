import { plugin } from '@cspell/parser-c-cpp-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'c',
      parser: 'c-cpp-strings-comments',
    },
  ],
};
