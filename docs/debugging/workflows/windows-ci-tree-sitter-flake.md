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

### Fix attempt D - force a single vitest worker process (also disproved)

Hypothesis: this package's own 4 test files (`parser.test.ts`, `index.test.ts`, `plugin.test.ts`,
`recommended.test.ts`) all load the tree-sitter native addon at import time. Vitest's `forks` pool (its
default - verified directly against the installed `vitest@5.0.1` source, `resolveTestConfig` sets
`resolved.pool ??= "forks"` unconditionally before any other pool fallback runs) can run multiple test files
concurrently in separate forked processes. Several processes `dlopen`-ing the identical native `.node` binary
from disk at nearly the same instant is a known category of Windows-specific flakiness (file locking /
antivirus interference during concurrent loads) that could plausibly produce a binary that _loads_
successfully but has a few wrong internal lookups, rather than an outright crash.

Added `packages/parser-typescript-tree-sitter/vitest.config.ts` with `test: { maxWorkers: 1 }` (the Vitest 4+
replacement for the removed `poolOptions.forks.singleFork` - forces this package's own test run down to one
worker process total, so no two of its own test files' processes can ever load the native module
concurrently). **Failed on its very first `windows-latest` run** - no lucky pass this time - with the same
symptom family (`imports.ts`'s re-export and dynamic-`import()` module-specifier tags missing).

This rules out cross-process contention within the package as the cause: with `maxWorkers: 1` there is
exactly one process for the whole package's test run, and it still failed. Reverted (no reason to keep a
slower single-worker config that didn't help).

Four independent mitigations were tried and disproved before landing on the fix below: fresh `Parser`
instance per call, `.reset()` before reuse, pinning `tree-sitter` to the version `tree-sitter-typescript`
actually supports, and forcing a single vitest worker process. Three passed their first `windows-latest` run
and failed on retest; one failed immediately. None of them touch the same lever, which means the bug isn't in
how this package manages the `Parser` instance, isn't the tree-sitter/tree-sitter-typescript version mismatch
(though that's still worth having fixed on its own merits - see attempt C above), and isn't cross-process
contention over the native binary file. What's left standing is that this is very likely inherent, timing- or
memory-layout-dependent non-determinism inside the native tree-sitter Windows binary itself, outside what
this repo's code or config can control.

## Resolution: stop depending on the native binding on Windows

Since the flake looks like it lives in the native tree-sitter/tree-sitter-typescript binary itself rather
than in this repo's code, the fix taken was to stop exercising that code path on `windows-latest` rather than
keep chasing it there:

- `@cspell/parser-typescript` (previously a thin re-export of `@cspell/parser-typescript-tree-sitter`, the
  native package) now re-exports `@cspell/parser-typescript-tree-sitter-wasm` instead - the WebAssembly
  build, which doesn't touch the flaky native binding at all. All of `parser-typescript`'s own tests (and
  `@cspell/parser-javascript`'s, which wraps it in turn) passed unchanged against the wasm backend, and it
  has _fewer_ production dependencies this way (one, `@vscode/tree-sitter-wasm`, vs. two for native). This
  required also publishing a `./tags` export from `parser-typescript-tree-sitter-wasm` (mirroring what
  `parser-typescript-tree-sitter` already had from #120), since `parser-typescript`'s `tags.ts` needed
  somewhere non-native to re-export `tagsAndMeaning` from.
- `.github/workflows/test.yml`'s `windows-latest` leg now excludes `@cspell/parser-typescript-tree-sitter`
  (the raw native package) and `@internal/test-packages-typescript` (its harness, which independently
  exercises the native module via `--all`) from the main `Test` step, and runs a separate,
  scoped `node exec-test.mts --module @cspell/parser-typescript --module @cspell/parser-typescript-tree-sitter-wasm`
  step so the harness still covers both non-native parsers there. The dedicated `Typecheck` step still covers
  every package, including the native one, in full - only its runtime tests are skipped on `windows-latest`.

**This does not fix the underlying native binding bug** - `@cspell/parser-typescript-tree-sitter` itself is
still expected to fail intermittently on `windows-latest` if its tests were ever re-enabled there, and should
stay excluded (or gain a CI-level retry) until there's an upstream fix. The `tree-sitter` version pin (attempt
C above) is kept regardless, since it fixes a real, independently-verified problem on its own merits.

One wrinkle hit while implementing this: GitHub's `pull_request` checkout tests a _merge_ of the PR branch
into the current `main`, not the branch alone. `main` had moved forward mid-investigation with a change that
added `parser-typescript/src/tags.ts` importing from the native package's `./tags` export - invisible on the
PR branch itself, but a real `ERR_MODULE_NOT_FOUND`/`TS2307` once merged, since this fix had just removed that
dependency. Merging `main` locally and testing against that merge (not just the branch tip) surfaced and
resolved it before it could confuse anyone as another dose of Windows flakiness.

## Process notes for next time

- **A single green CI run does not confirm a fix for an intermittent failure - not even two.** This
  investigation had three separate workarounds each pass their very first run and then fail on an unmodified
  retest. For a failure rate around 50%, one confirming pass has a coin-flip chance of being pure luck;
  budget for several deliberate re-runs (`gh run rerun <run-id>`) with _no_ code change before believing a
  fix, and treat "passed once" as no signal at all on its own.
- **An isolated repro script that never fails is informative, not exculpatory** - it ruled out CRLF and a
  single-parse-call scenario, but the real bug only showed up after several `parse()` calls accumulated in
  one process, which is exactly what the full test suite (and nothing simpler) exercises.
- **Verify a tool's actual default against the installed version's source, not docs or memory, before
  spending a CI cycle on it.** Vitest's default `pool` changed from `'threads'` to `'forks'` in the 4.0 "pool
  rework" (which also removed `poolOptions` in favor of top-level options like `maxWorkers`/`isolate`) -
  `grep "resolved.pool ??=" node_modules/.pnpm/vitest@<version>*/node_modules/vitest/dist/chunks/*.js` shows
  the actual resolved default for the exact version installed. This repo's `vitest@5.0.1` already defaults to
  `forks`, so passing `--pool=forks` explicitly here is a no-op; a workaround remembered from a different
  repo may have been targeting an older Vitest version where that default was still `'threads'`.
- **Check `pnpm-lock.yaml` for peer-dependency drift** whenever a native-binding package (anything with
  `tree-sitter`-style `peerDependencies`) reports platform-specific weirdness - `grep '<package>@' pnpm-lock.yaml`
  shows the resolved peer version inline, e.g. `tree-sitter-typescript@0.23.2(tree-sitter@0.21.1)`. Worth
  fixing on its own merits even when (as here) it turns out not to explain the symptom you were chasing.
- **When a long-running branch's CI suddenly fails for a reason unrelated to your last change, check whether
  `main` moved.** `pull_request`-triggered workflows test a merge of the PR branch into current `main`, not
  the branch alone - a `Cannot find module`/`TS2307` error referencing a file that doesn't exist on the
  branch itself is a strong signal of this, not a new flake. `git fetch origin main && git merge origin/main`
  locally reproduces exactly what CI is testing.
- **Sometimes the fix for a flaky native dependency is to stop depending on it**, not to keep tuning how it's
  called. If an equivalent, already-tested alternative exists in the repo (here, the wasm build sitting right
  next to the native one), swapping a downstream consumer onto it can be less effort and more reliable than
  continuing to chase a native binary's internal bug.

## Sources

- [tree-sitter/node-tree-sitter#57 - Requiring tree-sitter from multiple threads causes error](https://github.com/tree-sitter/node-tree-sitter/issues/57)
- [tree-sitter/node-tree-sitter#290 - reinterpretation of a JS value as wrapped C++ object leads to seg faults](https://github.com/tree-sitter/node-tree-sitter/issues/290)
- [Vitest - Common Errors (native addon multi-thread/process safety)](https://vitest.dev/guide/common-errors)
- [Vitest - `pool` config (default `'forks'`)](https://vitest.dev/config/pool)
