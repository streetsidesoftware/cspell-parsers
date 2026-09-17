import { plugin as typeScriptPlugin } from '@cspell/parser-typescript-tree-sitter-wasm/plugin';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript',
    },
  ],
};
