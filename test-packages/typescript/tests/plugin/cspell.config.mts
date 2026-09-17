const moduleName = process.env['CSPELL_PARSER_TYPESCRIPT_MODULE'] || '@cspell/parser-typescript';

const modules = await import(moduleName + '/plugin');
const typeScriptPlugin = modules.plugin;

export default {
  plugins: [typeScriptPlugin],
  languageSettings: [
    {
      languageId: 'typescript',
      parser: 'typescript',
    },
  ],
  reporters: ['default', '../../lib/reporter.mts'],
};
