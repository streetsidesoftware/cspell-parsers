import { plugin } from '@cspell/parser-example/plugin';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'c',
      parser: 'c-style-comments',
    },
  ],
};
