import { plugin, supportedFileTypes } from './plugin.js';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: supportedFileTypes.join(','),
      parser: 'java-strings-comments',
    },
  ],
};
