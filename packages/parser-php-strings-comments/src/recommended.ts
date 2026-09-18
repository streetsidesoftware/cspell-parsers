import { plugin, supportedFileTypes } from './plugin.js';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: supportedFileTypes.join(','),
      parser: 'php-strings-comments',
    },
  ],
};
