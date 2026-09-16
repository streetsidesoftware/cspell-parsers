import { plugin as javaScriptPlugin } from '@cspell/parser-javascript/plugin';

export default {
  plugins: [javaScriptPlugin],
  languageSettings: [
    {
      languageId: 'javascript',
      parser: 'javascript',
    },
  ],
};
