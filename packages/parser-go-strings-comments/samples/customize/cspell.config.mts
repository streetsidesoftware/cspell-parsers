import { customizePlugin } from '@cspell/parser-go-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': false, string: true } })], // only check string/rune literals, not comments
  languageSettings: [
    {
      languageId: 'go',
      parser: 'go-strings-comments',
    },
  ],
};
