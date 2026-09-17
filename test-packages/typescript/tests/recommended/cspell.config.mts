const moduleName = process.env['CSPELL_PARSER_TYPESCRIPT_MODULE'] || '@cspell/parser-typescript';

export default {
  import: [moduleName + '/recommended'],
};
