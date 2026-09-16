import { supportedFileTypes, plugin as javaScriptPlugin } from './plugin.js';

export default {
  plugins: [javaScriptPlugin],
  languageSettings: [
    {
      languageId: supportedFileTypes.join(','),
      parser: 'javascript',
    },
  ],
};
