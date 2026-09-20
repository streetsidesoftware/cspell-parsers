import { customizePlugin } from '@cspell/parser-strings-comments/plugin';

const plugin = customizePlugin('*', { tags: { '*': false, comment: true} });

export default {
  plugins: [plugin],
  languageSettings: plugin.recommendedLanguageSettings,
};
