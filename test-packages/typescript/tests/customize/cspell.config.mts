const moduleName = process.env['CSPELL_PARSER_TYPESCRIPT_MODULE'] || '@cspell/parser-typescript';

const modules = await import(moduleName + '/plugin');
const customizePlugin = modules.customizePlugin;

export default {
  plugins: [
    customizePlugin({ tags: { '*': false, comment: true, 'comment.block': false, 'comment.block.doc': true } }),
  ],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript',
    },
  ],
  reporters: ['default', '../../lib/reporter.mts'],
};
