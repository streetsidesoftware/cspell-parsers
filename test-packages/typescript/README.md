# Test Package for ALL Typescript parsers

This is a test package to help make sure all the parsers have the same results.

The environment variable `CSPELL_PARSER_TYPESCRIPT_MODULE` is used to communicate the name of the module under test to the `cspell.config.mts` files.

Run it with `pnpm test` (all backends listed in `package.json`'s `dependencies`), or target specific ones with
`node exec-test.mts --module <name>` (repeatable).

## `tests/plugin`, `tests/recommended`, `tests/customize`, `tests/with-issues`

Every backend is checked with a single `cspell` run over the whole `tests` folder (cspell resolves the
nearest `cspell.config.mts` per file, so each of these gets its own settings). `tests/plugin`,
`tests/recommended`, and `tests/customize` are the "happy path" - clean fixtures. `tests/with-issues`
contains deliberate, known typos, used to check that every backend reports the exact same words at the exact
same `row`/`col`.

Either way, pass/fail comes from diffing the run's captured issues against the checked-in
`__snapshots/tests.json`, not from cspell's own exit code (which is always non-zero for `with-issues`, since
those typos are real and expected). The diffing works via `lib/reporter.mts`, a custom cspell reporter
(wired up in `tests/cspell.config.mts`) that captures every `issue` event into
`__snapshots/tests.actual.json`. That file is gitignored and only left behind when the snapshot check
fails, for inspection.

If you add or change a fixture and the new results look right, promote them to the golden snapshot with:

```sh
pnpm run test:update
```
