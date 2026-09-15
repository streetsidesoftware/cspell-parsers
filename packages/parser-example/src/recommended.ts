import { plugin } from './plugin.js';

export default {
  plugins: [plugin],
  languageSettings: [
    {
      languageId: 'c,cpp,csharp,java,javascript,typescript',
      parser: 'c-style-comments',
    },
  ],
};
