import { customizePlugin } from '@cspell/parser-ruby-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { 'string.heredoc': false } })], // exclude heredocs - often SQL/text blobs
  languageSettings: [
    {
      languageId: 'ruby',
      parser: 'ruby-strings-comments',
    },
  ],
};
