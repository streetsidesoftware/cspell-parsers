# Windows CI flake in `parser-typescript-tree-sitter` (PR #119)

PR #119 added a `windows-latest` leg (and a Node 22.x/26.x matrix) to `.github/workflows/test.yml`, which
had previously only run on `ubuntu-latest`/Node 22. That surfaced two unrelated Windows-only problems. This
document is the investigation log for the second, harder one, kept for whoever next sees
`parser-typescript-tree-sitter` fail intermittently on Windows.

## Problem 1: CRLF line endings (quick fix)

The first `windows-latest` run failed across several packages (`parser-example`,
`parser-csharp-strings-comments`, ...) with assertions like:

```
AssertionError: expected 'running total\r' to be 'running total'
```

Cause: none of the `fixtures/` directories had a `.gitattributes` entry, so Windows runners' default
`core.autocrlf=true` converted the fixtures' real `\n` newlines to `\r\n` on checkout. The tests assert on
exact fixture byte content (`parser.parse()`'s `text`/`rawText` fields), so the extra `\r` broke them.
`.editorconfig` already declared `end_of_line = lf`, but that only advises editors, not `git checkout`.

Fix: added a root `.gitattributes` with `* text=auto eol=lf`, forcing LF on checkout regardless of platform.
This fully resolved every failure except the ones below.

## Problem 2: intermittent tree-sitter field-resolution corruption

After the CRLF fix, `parser-typescript-tree-sitter`'s tests still failed on `windows-latest` intermittently
(passed 2 of 6 runs observed during this investigation, with no code changes to the package in between some
of those runs). The symptom was always the same shape, on different fixtures/tests across runs:

```
AssertionError: expected true to be false  // isBareModuleSpecifier('prettier') misclassified
AssertionError: expected { string: true, …(1) } to deeply equal { string: true, …(5) }  // module.* tags missing
```

`isModuleSpecifierString()` (`src/walk.ts`) relies on `parent.childForFieldName('source') === node` to
recognize an import/export/dynamic-`import()` specifier. On the failing runs, that field lookup returned
`undefined` (or the wrong node) for the _first_ import statement of whichever fixture ran into the bug -
never on macOS/Linux, and never in an isolated single-`parse()`-call script (see below).

### Hypotheses tried, in order

1. **Reused `Parser` instance is corrupted by state left over from earlier parses.**
   `src/walk.ts` memoizes one native `TreeSitterParser` per language
   (`tsParsers: Map<TSLanguage, TreeSitterParser>`) and reuses it across every `parse()` call - by the time a
   later fixture in `parser.test.ts` is parsed, that instance has already parsed several earlier fixtures.
   An isolated script that parsed the failing fixture in a _fresh_ process, exactly once, never reproduced
   the bug - only the full test suite (many sequential `parse()` calls on the shared instance) did.

   - **Fix attempt A - fresh `Parser` per call:** removed the cache entirely. Windows run passed (1/1).
   - **Fix attempt B - `.reset()` before reuse:** kept the cache, but called `tsParser.reset()` before each
     reuse (cheaper than reconstructing the parser + reloading its grammar every call). Windows run passed
     (1/1).
   - **Disproof:** re-running fix attempt B's _exact_ commit (no code change) failed again, on a different
     fixture (`imports.ts`'s dynamic `import()` specifier instead of `imports-and-local-variables.mts`'s
     static import). Identical code producing pass-then-fail means neither workaround was actually
     controlling the outcome - both "passes" were luck, not fixes. This ruled out "how this package manages
     the `Parser` instance" as the actionable lever.

2. **A genuine native-level bug, likely related to a real dependency mismatch.** Web research turned up
   three supporting data points (see Sources below):
   - `node-tree-sitter` historically wasn't safe to use from more than one JS execution context in the same
     process (crashed until rewritten onto N-API in
     [tree-sitter/node-tree-sitter#57](https://github.com/tree-sitter/node-tree-sitter/issues/57); a
     maintainer flagged in that thread that some `static` variables might still not be thread-safe even
     after the rewrite).
   - Vitest's own docs list tree-sitter-style native addons as a known class of "not built to be
     multi-thread/multi-process safe" dependency (<https://vitest.dev/guide/common-errors>). This repo's
     Vitest already defaults to `pool: 'forks'` (process isolation, not `worker_threads`), but Vitest still
     _reuses_ forked processes across multiple test files for speed, so a native addon's state can still
     accumulate within one OS process across files, not just within one file's own sequential calls.
   - `tree-sitter@0.25.1` (what was installed) has an open, recently-filed memory-safety issue
     ([tree-sitter/node-tree-sitter#290](https://github.com/tree-sitter/node-tree-sitter/issues/290)) -
     general evidence the native binding isn't rock solid at that version.
   - **The concrete, verifiable finding:** `tree-sitter-typescript@0.23.2` (the latest published version)
     declares `peerDependencies: { "tree-sitter": "^0.21.0" }`. This package had `tree-sitter@^0.25.1`
     installed - outside that range - and **no released version of `tree-sitter-typescript` has ever
     declared support for `tree-sitter@0.22+`**. The combination this package was actually running had never
     been tested by tree-sitter-typescript's own maintainers.

### Fix attempt C - dependency version pin (also disproved)

Pinned `tree-sitter` to `^0.21.1` in `packages/parser-typescript-tree-sitter/package.json` - the last
release before the range `tree-sitter-typescript` stops declaring support for, and confirmed still available
on npm with prebuilds. `pnpm install` resolved `tree-sitter-typescript@0.23.2(tree-sitter@0.21.1)`, matching
what tree-sitter-typescript is actually built and tested against. This is a real, worth-keeping fix for a
real problem (running an untested dependency combination), independent of whether it explains the flake.

Passed on `windows-latest` on the first run. A deliberate re-run of the _same_ commit (`gh run rerun
<run-id>`, no code change) then **failed** - same symptom shape, this time on
`imports.ts`'s "tags a re-export source the same as an import source" test. This makes three independent
"fixes" (fresh `Parser` per call, `.reset()` before reuse, and this dependency pin) that each passed their
first `windows-latest` run and then failed on an unmodified retest. That pattern - identical code producing
different outcomes across runs - means none of the three actually control the outcome, and the flake is very
likely inherent non-determinism in the native tree-sitter/tree-sitter-typescript Windows binary itself
(memory-layout- or timing-dependent undefined behavior), not something fixable from this package's code or
`package.json`.

**Current status: unresolved.** The version pin is being kept anyway (it fixes a real, independently-verified
problem - see above - even though it didn't fix the Windows flake), but `windows-latest` for
`parser-typescript-tree-sitter` should be assumed to fail intermittently (roughly 50% of observed runs, 3 of 6) until this is fixed upstream or worked around at the CI level (retry, or dropping this leg).

## Process notes for next time

- **A single green CI run does not confirm a fix for an intermittent failure - not even two.** This
  investigation had three separate workarounds each pass their very first run and then fail on an unmodified
  retest. For a failure rate around 50%, one confirming pass has a coin-flip chance of being pure luck;
  budget for several deliberate re-runs (`gh run rerun <run-id>`) with _no_ code change before believing a
  fix, and treat "passed once" as no signal at all on its own.
- **An isolated repro script that never fails is informative, not exculpatory** - it ruled out CRLF and a
  single-parse-call scenario, but the real bug only showed up after several `parse()` calls accumulated in
  one process, which is exactly what the full test suite (and nothing simpler) exercises.
- **Check `pnpm-lock.yaml` for peer-dependency drift** whenever a native-binding package (anything with
  `tree-sitter`-style `peerDependencies`) reports platform-specific weirdness - `grep '<package>@' pnpm-lock.yaml`
  shows the resolved peer version inline, e.g. `tree-sitter-typescript@0.23.2(tree-sitter@0.21.1)`. Worth
  fixing on its own merits even when (as here) it turns out not to explain the symptom you were chasing.

## Sources

- [tree-sitter/node-tree-sitter#57 - Requiring tree-sitter from multiple threads causes error](https://github.com/tree-sitter/node-tree-sitter/issues/57)
- [tree-sitter/node-tree-sitter#290 - reinterpretation of a JS value as wrapped C++ object leads to seg faults](https://github.com/tree-sitter/node-tree-sitter/issues/290)
- [Vitest - Common Errors (native addon multi-thread/process safety)](https://vitest.dev/guide/common-errors)
- [Vitest - `pool` config (default `'forks'`)](https://vitest.dev/config/pool)
