# Templates

## `docs/ADRs/README.md` (top-level index, created once on first use)

```markdown
# Architecture Decision Records

Each subdirectory is one feature, named by its feature slug. Inside, ADRs are numbered sequentially
(`0001-...`, `0002-...`) in the order they were decided. See each feature's own `README.md` for its list.

Produced by the `feature-adr` skill during feature design — see that skill for the process.

## Features

- <feature-slug> — <one-line description>
```

Append one bullet per feature the first time that feature's directory is created. Don't rewrite existing
bullets when adding to a feature that's already listed.

## `docs/ADRs/<feature-slug>/README.md` (per-feature index, created once per feature)

```markdown
# <Feature Name>

<One or two sentences: what this feature is and why it needed design decisions.>

## Why

- <The problem or pain that prompted this, and who has it.>
- <Why now: the request, bug, or limit hit that made it worth doing.>
- <Constraints that shape it: the platform's fixed rules, compatibility, size budget, ...>

## Goal

<What success looks like: something a user can do, or a config they can write, that they can't today.>

## Out of scope

- <What this feature deliberately doesn't do.>

## Decisions

| #   | Title | Status |
| --- | ----- | ------ |

## Open questions

- <Question deferred during the interview, and what it's waiting on.>

## Provisional names

- `<Name>`: <what it names>. Decide by <when, e.g. before the migration's final step>. Tracked in <issue>.
```

Append one table row per ADR as it's written: `| 0001 | <title> | Accepted |`. Remove the Open questions
and Provisional names sections when they're empty.

## `docs/ADRs/<feature-slug>/NNNN-<decision-slug>.md` (one per decision)

```markdown
# NNNN. <Decision title, phrased as the thing being decided>

Status: Proposed | Accepted | Accepted, amended (see [Amendment](#amendment-...)) | Superseded by [NNNN](./NNNN-slug.md)

## Context

What situation makes this decision necessary? What constraints apply (existing package conventions,
cspell's Parser/Plugin contract, dist-size/dependency budget, etc.)? What are the real options being
weighed — not a rhetorical setup for a foregone conclusion.

## Decision

The choice that was made, stated plainly as a decision ("We will ..."), not as a summary of the discussion.

## Consequences

What this makes easier, what it makes harder, and what it forecloses. Include concrete follow-on effects
specific to this repo where they apply — e.g. "the `foo.block.doc` tag becomes part of the package's public
surface once a consumer can `customizePlugin` against it" or "this rules out later making the backend
swappable without a breaking change to `supportedFileTypes`."
```

An ADR amended after its design merged gets one more section at the end. Keep the original text as it was:

```markdown
## Amendment: <what changed>

What changed, why (what implementation or review found), and what the decision is now.
```

Title case the filename slug the same way the feature slug is cased (kebab-case), e.g.
`0001-emit-hierarchical-comment-tags.md`.

## `docs/ADRs/<feature-slug>/README.md` after archiving (step 10)

Replaces the feature index and its ADR files. Keep it short: the essence, not the detail.

```markdown
# <Feature Name> (archived)

<One or two sentences: what this feature is.>

The full ADRs are in git history: [docs/ADRs/<feature-slug> at <short-sha>](https://github.com/<owner>/<repo>/tree/<full-sha>/docs/ADRs/<feature-slug>).

## Why

- <Carried over from the index. This is the part that must survive: why the feature was done.>

## Goal

<Carried over from the index.>

## What was built

<A few sentences, or a short list: what exists now because of this feature, and where it lives.>

## Key decisions

- **<Decision>.** <Why, in one sentence.>

## Learnings and improvements

- <What implementation or review changed, and what to do differently next time.>
```

In `docs/ADRs/README.md`, mark the feature's bullet `(archived)`.

## `docs/glossary.md` (created once, repo-wide)

```markdown
# Glossary

Terminology introduced or clarified while designing features with the `feature-adr` skill. Alphabetical.

## <Term>

<One or two sentence definition.> Established in [<feature-slug>/NNNN](./ADRs/<feature-slug>/NNNN-slug.md).
```

Insert new `## <Term>` entries in alphabetical order among existing ones — don't just append to the bottom.
When a later ADR changes what a term means, edit the existing entry in place and update (or add to) its
source-ADR link rather than creating a duplicate heading.
