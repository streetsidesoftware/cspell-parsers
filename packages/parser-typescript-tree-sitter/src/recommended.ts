import { supportedFileTypes, plugin as typeScriptPlugin } from './plugin.js';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: supportedFileTypes.join(','),
      parser: 'typescript',
    },
  ],
};
