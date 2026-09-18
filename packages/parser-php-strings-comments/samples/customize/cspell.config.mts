import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { '*': true, markup: false } })], // skip HTML outside <?php ?>
  languageSettings: [
    {
      languageId: 'php',
      parser: 'php-strings-comments',
    },
  ],
};
