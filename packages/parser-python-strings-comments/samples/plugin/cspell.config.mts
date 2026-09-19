import { plugin } from '@cspell/parser-python-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'python',
      parser: 'python-strings-comments',
    },
  ],
};
