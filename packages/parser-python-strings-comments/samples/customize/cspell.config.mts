import { customizePlugin } from '@cspell/parser-python-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': true, 'string.interpolated': false } })],
  languageSettings: [
    {
      languageId: 'python',
      parser: 'python-strings-comments',
    },
  ],
};
