import { plugin as typeScriptPlugin } from './plugin.js';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: 'typescript,javascript,typescriptreact,javascriptreact',
      parser: 'typescript',
    },
  ],
};
