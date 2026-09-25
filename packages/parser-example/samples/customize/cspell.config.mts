import { customizePlugin } from '@cspell/parser-example/plugin';

// Check only doc comments.
const customPlugin = customizePlugin({ tags: { '*': false, 'comment.block.doc': true } });

export default {
  plugins: [customPlugin],
  languageSettings: customPlugin.languageSettings(),
};
