import { plugin as typeScriptPlugin } from '@cspell/parser-typescript-tree-sitter/plugin';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript',
    },
  ],
};
