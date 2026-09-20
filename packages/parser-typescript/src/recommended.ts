import { plugin as typeScriptPlugin, supportedFileTypes } from './plugin.js';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: supportedFileTypes.join(','),
      parser: 'typescript',
    },
  ],
};
