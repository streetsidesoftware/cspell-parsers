---
name: new-parser-plugin
description: 'Design and build a new cspell parser plugin package in this repo, from interview to one pull request: why and for whom, file types, tags, scanner or tree-sitter backend, and edge cases, recorded as ADRs, then the package itself with fixtures, samples, README, and passing checks. Use this whenever the user wants to add support for a new language or file type, create a new parser package, or asks to "add a parser for X". For a change to an existing parser package, or a feature that isn''t a new package, use feature-adr instead.'
---

# new-parser-plugin

Takes a new parser plugin from idea to a single pull request: the design decisions first, as ADRs, then the
package built against them. A parser package bakes decisions into public API from its first release: parser
names, `supportedFileTypes`, and tag names all show up in users' configs. So the design comes first, while
it's still cheap to change, and the ADRs explain later why the package is the way it is.

The design half is the `feature-adr` skill's process. Read `.claude/skills/feature-adr/SKILL.md` before
starting; this skill refers to its steps rather than repeating them.

## Workflow

1. **Name it.** Agree on the package name (`@cspell/parser-<name>`, directory `packages/parser-<name>`).
   The package directory name is also the ADR feature slug: `docs/ADRs/parser-<name>/`.

2. **Set up a worktree** on a `claude-new-parser-<name>` branch, as in `feature-adr` step 2. The design and
   the package go in the same branch and the same PR.

3. **Design.** Follow `feature-adr` steps 3–6: bootstrap the ADR directory, then interview one decision at a
   time, writing and committing one ADR per decision and keeping the glossary in sync.
   - Start with `feature-adr`'s interview guide, group 0: why, stakeholders, and the goal.
   - Then use `references/parser-interview-guide.md` for the parser decisions: scope and template, file
     types, tags, backend, edge cases, testing and samples, and release surface.
   - Ask the way `feature-adr` step 4 describes: lettered options showing what a user would write, checking
     facts before asking, and letting the user defer.

4. **Finalize the design before building.** Once the user says the design is final, squash the ADRs into a
   tight set (`feature-adr` step 8) and commit. The package is built against these ADRs. If the build shows
   a decision was wrong, stop, update the ADR with the user, and then continue.

5. **Build the package.** Follow `docs/guides/new-parser-package.md`'s steps, starting from the
   template chosen in the design. The rules below are the ones most easily missed; `CLAUDE.md` has the rest.
   - Every top-level `src/*.ts` needs an entry in both `tsdown.config.ts` and `package.json`'s `exports`.
   - A hand-written scanner emits `parsedTexts` lazily, with generators.
   - Every emitted tag is declared in `src/tags.ts`, with its meaning, which generates the README's tags
     table.
   - Tests use raw snippets in `fixtures/`. Every special case the README mentions has a test, linked from
     the README with a hidden `<!--- Tested by ... --->` comment.
   - `samples/` holds real configs and correctly spelled sources. Every config example in the README is
     injected from a sample. Check each filter sample both ways, with and without its filter, using
     `--no-config-search`.
   - The README is for someone using the plugin. Its intro says what the plugin checks and why to pick it,
     and its links are absolute `https://` URLs.
   - Add the package to the `parser-strings-comments` bundle if the design says so.

6. **Run every check** from the worktree root:

   ```sh
   pnpm install
   pnpm run build && pnpm run build:readme
   pnpm lint
   pnpm run lint-ci && pnpm run typecheck && pnpm test
   pnpm exec cspell --no-progress .
   ```

   `pnpm run lint` also adds the new package to `release-please-config.json`. Never add it to
   `.release-please-manifest.json`. Note the new package's `dist` size for the PR body.

7. **Open one PR** with the ADR commits followed by the package. Use a `feat(parser-<name>):` title. The
   body has a Summary of what the plugin checks and for whom, then the design (one line per ADR, linking to
   the ADR index), then the package's internals, the checks that ran, and its `dist` size. Push only when the
   user asks, or when the task was to open the PR.

8. **After merge,** remove the worktree and delete the branch. From then on, amend or archive the ADRs with
   `feature-adr` (steps 9 and 10).

## Notes

- If the "new parser" turns out to be a new file type for an existing package, stop and say so. That's a
  change to the existing package, designed with `feature-adr`.
- Don't let the build quietly change the design. A decision that doesn't survive contact with the code goes
  back to the user, and its ADR is updated before the PR.
