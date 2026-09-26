# Dependency licenses

Every package in this repo is released under the [MIT license](../LICENSE). Before a package takes on a
dependency, or copies code or data from elsewhere, check that its license lets us ship it under MIT. A
dependency whose license would force our license to change can stop a package entirely, so check before
building on it, not after.

## What to review

- **Production dependencies**, and everything they pull in. Users install these alongside the package.
  `pnpm licenses list --prod --filter <package-name>` lists them with their licenses.
- **Anything bundled into `dist/`.** tsdown inlines dev dependencies' code and types, such as
  `@cspell/cspell-types`, and we redistribute whatever it inlines.
- **Anything copied into `src/`**: a grammar, a `.wasm` file, a keyword or entity table, a ported algorithm.
  Record where it came from, next to the copy.

## How to judge a license

| License                                                    | Verdict                                                                                                   |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| MIT, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, Unlicense, CC0 | OK.                                                                                                       |
| Apache-2.0                                                 | OK as a dependency. If bundled or copied, keep its license and any `NOTICE` text with the copy.           |
| MPL-2.0                                                    | OK as an unmodified dependency. Copied or modified files stay MPL-2.0: ask first.                         |
| LGPL                                                       | Ask first. OK as an unmodified, separately installed dependency; bundling or copying it adds obligations. |
| GPL, AGPL                                                  | Stop. It would make the package GPL or AGPL.                                                              |
| No license, unknown, or custom terms                       | Stop. No license means no permission to use it. Custom terms need a person to read them.                  |
| Dual-licensed                                              | Pick the option that's OK above, and say which one you picked.                                            |

A permissive license still has one condition: when we bundle or copy the code, its copyright and license text
must ship with it.

## When a license is a problem

Stop and raise it before building on the dependency. Be specific:

- **Which dependency**, at which version, and whether it's direct or pulled in by another (name that one).
- **Its license**, exactly as its `package.json` or `LICENSE` file states it, with a link.
- **Why it matters here**: installed, bundled, or copied, and the obligation that follows.
- **What would have to change**: for example, "`@cspell/parser-x` would have to be released under GPL-3.0-or-later
  instead of MIT, and so would any package that bundles it, such as `@cspell/parser-strings-comments`."
- **The alternatives**: another library, another backend, a hand-written scanner, or leaving the feature out.

Changing a package's license is a decision for the maintainers, not part of building a package.
