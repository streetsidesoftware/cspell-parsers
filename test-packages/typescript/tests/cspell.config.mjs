export default {
  // `with-issues` contains deliberate, known typos (see tests/with-issues/cspell.config.mts) - it's
  // checked separately, on purpose, so it's excluded here rather than failing every other run.
  ignorePaths: ['with-issues'],
  reporters: ['default', '../lib/reporter.mts'],
};
