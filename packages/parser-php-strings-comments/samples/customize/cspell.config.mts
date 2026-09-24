import { customizePlugin } from '@cspell/parser-php-strings-comments/plugin';

export default {
  plugins: [customizePlugin({ tags: { html: true } })], // also check HTML outside <?php ?>
  languageSettings: [
    {
      languageId: 'php',
      parser: 'php-strings-comments',
    },
  ],
};
