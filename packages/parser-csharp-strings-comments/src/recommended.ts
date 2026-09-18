import { plugin, supportedFileTypes } from './plugin.js';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: supportedFileTypes.join(','),
      parser: 'csharp-strings-comments',
    },
  ],
};
