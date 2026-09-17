# Test Package for ALL Typescript parsers

This is a test package to help make sure all the parsers have the same results.

The environment variable `CSPELL_PARSER_TYPESCRIPT_MODULE` is used to communicate the name of the module under test to the `cspell.config.mts` files.

Run it with `pnpm test` (all backends listed in `package.json`'s `dependencies`), or target specific ones with
`node exec-test.mts --module <name>` (repeatable).

## `tests/plugin`, `tests/recommended`, `tests/customize`

These fixtures must produce **zero** issues on every backend - they're the "happy path".

## `tests/with-issues`

This fixture contains deliberate, known typos. Every backend must report the exact same words at the exact
same `row`/`col`, which is checked by diffing against the checked-in `snapshot.json`, not by cspell's own
exit code (which is always non-zero here, since the typos are real and expected).

The diffing works via `lib/reporter.mts`, a custom cspell reporter that captures every `issue` event into
`actual.snapshot.json` (gitignored - it's regenerated on every run). If you add a new deliberate typo to
`tests/with-issues` and the new `actual.snapshot.json` looks right, promote it to the golden file:

```sh
cp tests/with-issues/actual.snapshot.json tests/with-issues/snapshot.json
```
