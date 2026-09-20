import { plugin as javaScriptPlugin, supportedFileTypes } from './plugin.js';

export default {
  plugins: [javaScriptPlugin],
  languageSettings: [
    {
      languageId: supportedFileTypes.join(','),
      parser: 'javascript',
    },
  ],
};
