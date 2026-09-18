import { plugin } from '@cspell/parser-ruby-strings-comments/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'ruby',
      parser: 'ruby-strings-comments',
    },
  ],
};
