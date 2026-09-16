import { plugin as typeScriptPlugin } from '../dist/plugin.js';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript'
    }
  ]
};
