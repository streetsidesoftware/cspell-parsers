---
name: feature-adr
description: 'Design a new cspell-parser feature (a new parser, a behavior change, improvements) through a structured interview, recording each decision as an ADR under docs/ADRs/<feature-slug>/ and keeping docs/glossary.md in sync. Use this whenever the user wants to design, spec out, or plan a feature before writing code, is unsure how an edge case should behave, or explicitly asks for an ADR, a design doc, or to "figure out the details" of something. Trigger even if the user doesn''t say "ADR" or "skill" by name — any request to add new behavior to this tool that has more than one reasonable interpretation is a candidate. Do not use this for pure bug fixes, refactors, or requests where the behavior is already fully specified.'
---

# feature-adr

Turns a vague feature request into a small set of committed decisions, each captured as an ADR, before any
code gets written. The point isn't ceremony — it's that this repo's package shape
(`parser.ts`/`plugin.ts`/`index.ts`/`recommended.ts`, `tags`/`hierarchicalTags`, `customizePlugin`,
`supportedFileTypes`, backend choice) bakes a lot of decisions into files that are annoying to unwind later
(a tag name becomes public API the moment a consumer writes a `customizePlugin` filter against it; a
`supportedFileTypes` entry becomes a documented promise in the README). An interview surfaces those
decisions while they're still cheap to change, and the ADR trail means the _next_ person touching this
feature (including you, in six months) doesn't have to reverse-engineer why a tag is named the way it is.

## Workflow

1. **Establish the feature slug.** Ask the user for a short kebab-case name if they haven't given one (e.g.
   `json5-comments-parser`, `tags-negation-filter`). This names the ADR directory and anchors everything
   else — confirm it before creating any files.

2. **Set up a worktree before writing anything.** Do every file write for this feature in its own git
   worktree, so the design never sits as uncommitted changes in the user's main checkout, and they can
   keep working or reviewing there in parallel. Check for an existing one first, in case this continues
   an earlier session:

   ```sh
   git worktree list
   git branch --list claude-adr-<feature-slug>
   ```

   If neither exists, create both from an up-to-date `origin/main`:

   ```sh
   git fetch origin
   git worktree add -b claude-adr-<feature-slug> .claude/worktrees/claude-adr-<feature-slug> origin/main
   ```

   If the branch exists but has no worktree, attach it (without `-b`). If a worktree already exists, keep
   working in it. Creating the worktree is local and reversible, so no need to ask first. Don't push the
   branch or open a PR unless the user asks.

3. **Check/bootstrap the docs structure.** This repo has no `docs/ADRs/` or `docs/glossary.md` yet the first
   time this skill runs — that's expected, not an error.
   - If `docs/ADRs/` doesn't exist, create it with a top-level `docs/ADRs/README.md` index (see
     `references/adr-template.md` for its skeleton).
   - If `docs/glossary.md` doesn't exist, create it with a one-line header and an empty alphabetical list
     (see `references/adr-template.md` for its skeleton).
   - Create `docs/ADRs/<feature-slug>/` and its own `README.md` index for this feature.
   - If either file already exists, read it first — don't clobber prior features' entries.

4. **Interview one decision at a time.** Don't front-load a giant questionnaire. Ask a single, concrete
   question, let the user answer (or say "you decide" — then propose a default and state it as the
   decision), and only move to the next question once the current one is actually resolved. Read
   `references/interview-guide.md` before the first question — it's the question bank grounded in this
   repo's real decision points (new package vs. existing, `supportedFileTypes`, tags/`hierarchicalTags`,
   backend choice, fixtures/samples, dist-size/dependency impact) rather than generic feature-design
   questions. Skip any topic that plainly doesn't apply (e.g. backend choice for a feature that isn't
   `parser-typescript`-shaped) — the guide is a menu, not a script to run top to bottom regardless of fit.

   Keep sight of the description's own boundary: if a question turns out to have only one reasonable
   answer once you look at the code, that's not an ADR-worthy decision — just note it in context and move
   on. ADRs are for decisions where a reasonable person could've gone the other way.

5. **Write one ADR per resolved decision**, not one giant document. Batching several small, related
   decisions into a single ADR is fine (e.g. "which tags this parser emits" can cover the whole tag set in
   one ADR); keep separate what's separable, e.g. "which backend" and "which file types" almost always
   deserve their own ADRs because they can change independently later.
   - File: `docs/ADRs/<feature-slug>/NNNN-<decision-slug>.md`, four-digit zero-padded, sequential _within
     this feature's directory_ starting at `0001`. Check existing files in the directory before picking the
     next number — don't assume you're starting fresh if the user is resuming a feature from an earlier
     session.
   - Format: title, status, context, decision, consequences — see `references/adr-template.md`. Status is
     `Proposed` while still under discussion in this session and `Accepted` once the user confirms it; use
     `Superseded by NNNN-...` if a later ADR in the same directory overturns an earlier one (leave the old
     file in place, don't delete it).
   - After writing the file, append a one-line entry (number, title, status) to
     `docs/ADRs/<feature-slug>/README.md`.
   - Commit in the worktree right after writing or editing an ADR: one commit per ADR change, together
     with its index row, never saved up for the end. If the session is cut short, the history shows how
     far the design got and in what order. For example,
     `docs: plugin-customization ADR 0003, duplicated parser is appended`. Commit glossary edits the same
     way, as they happen.

6. **Sync the glossary as terminology comes up**, not just at the end. Any time the interview mints or
   resolves a term that isn't self-explanatory from the code — a new tag name, a new concept specific to
   this feature — add or update its entry in `docs/glossary.md`: alphabetical placement, short definition,
   and a link back to the ADR that established it. If a term already has an entry and this feature changes
   its meaning, update the entry in place rather than adding a second one, and note the change's source ADR.
   Don't add entries for things that are just implementation detail with no shared vocabulary value (e.g. a
   local variable name).

7. **Close the loop.** Once the open questions from step 4 are exhausted, summarize what was decided (a
   short list, one line per ADR) and point at the feature's `docs/ADRs/<feature-slug>/README.md`. If
   anything was explicitly left open (deferred rather than decided), say so plainly rather than letting it
   quietly vanish — a `Proposed` ADR with an unresolved question in its Context section is a fine way to
   carry that forward. Don't start writing implementation code as part of this skill; the ADRs are the
   handoff artifact, and the user can start a fresh task for implementation once they're ready.

   Tell the user where the work lives: the `claude-adr-<feature-slug>` branch in
   `.claude/worktrees/claude-adr-<feature-slug>`. Once its PR is merged, remove the worktree and delete the
   branch.

## Notes

- If the user is adding a genuinely new parser package, the interview should surface enough for someone to
  follow `CONTRIBUTING.md`'s "Adding a new parser package" steps afterward — but this skill's job stops at
  producing the decisions, not scaffolding the package itself.
- If mid-interview it becomes clear the request is actually a bug fix or a fully-specified change (no real
  decision left to make), say so and stop — don't manufacture an ADR for something that was never
  ambiguous.
