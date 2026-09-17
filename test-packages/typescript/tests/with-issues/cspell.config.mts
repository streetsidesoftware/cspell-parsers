const moduleName = process.env['CSPELL_PARSER_TYPESCRIPT_MODULE'] || '@cspell/parser-typescript';

export default {
  import: [moduleName + '/recommended'],
  // These are the reporter's own output files, not test fixtures - excluded so a stale
  // `actual.snapshot.json` from a previous run isn't re-scanned (and re-accumulated) by this one.
  ignorePaths: ['actual.snapshot.json', 'snapshot.json'],
  reporters: ['default', ['../reporter.mjs', { outFile: 'with-issues/actual.snapshot.json' }]],
};
