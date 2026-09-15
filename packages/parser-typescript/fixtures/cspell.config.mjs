import typeScriptPlugin from '../dist/index.js';

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript'
    }
  ]
};
