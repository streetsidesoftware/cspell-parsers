import { customizePlugin } from '@cspell/parser-typescript-strings-comments/plugin';

// Also check code, such as identifiers and keywords.
const customPlugin = customizePlugin({ tags: { code: true } });

export default {
  plugins: [customPlugin],
  languageSettings: customPlugin.languageSettings(),
};
