import { plugin as typeScriptPlugin } from '@cspell/parser-typescript/plugin';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript'
    }
  ]
};
