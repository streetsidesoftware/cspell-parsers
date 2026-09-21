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

## Decisions

| # | Title | Status |
| - | ----- | ------ |
```

Append one table row per ADR as it's written: `| 0001 | <title> | Accepted |`.

## `docs/ADRs/<feature-slug>/NNNN-<decision-slug>.md` (one per decision)

```markdown
# NNNN. <Decision title, phrased as the thing being decided>

Status: Proposed | Accepted | Superseded by [NNNN](./NNNN-slug.md)

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

Title case the filename slug the same way the feature slug is cased (kebab-case), e.g.
`0001-emit-hierarchical-comment-tags.md`.

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
