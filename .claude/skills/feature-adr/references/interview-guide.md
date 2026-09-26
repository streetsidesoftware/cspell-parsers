# Interview guide

A menu of the decision points that actually recur in this repo, grouped by theme. Pull from whichever
groups apply to the feature at hand — most features only touch two or three of these. Ask one question,
resolve it, write it down (as an ADR if it's genuinely a judgment call, or fold it into another ADR's
context if it's a detail), then move to the next.

Where a question has an obvious, low-stakes default given the rest of the repo's conventions, it's fine to
propose that default up front ("I'd default to X because the rest of the repo does Y — any reason to
deviate here?") rather than asking it as a fully open question. That's still a decision worth an ADR if the
user could reasonably have picked differently; it just makes the interview faster.

## 0. Why, stakeholders, and the goal (always first)

- Why are we doing this? What problem or pain prompted it?
- Why now? What made it worth doing: a bug, a request, a limit hit while building something else?
- If the first answer is a solution ("we need a builder") rather than a reason, try the five whys: ask "why?"
  of each answer until you reach the underlying need. Use it loosely; three whys are often enough, and it's
  fine to stop as soon as the reason is clear.
- Who are the stakeholders? Who is this for, and who else does it touch? In this repo that's usually:
  - users writing a cspell config (JSON/YAML or JS/TS);
  - plugin authors, in this repo or outside it;
  - maintainers of this repo;
  - cspell itself and its VS Code extension, when the change depends on or affects their behavior.
- How is each stakeholder affected? What gets easier, what changes under them (a breaking change, a
  migration, a renamed parser), and what they need to know or do.
- What does success look like? Describe it as something a user can do, or a config they can write, that
  they can't today.
- What's deliberately out of scope?

Record the answers in the feature's `README.md` (Why, Stakeholders, Goal, Out of scope) before the first
decision. The why is what the archive summary keeps when the ADRs are gone.

## 1. API and cross-cutting design

For a feature that changes how users customize or combine plugins, or reshapes `@internal/utils`, rather
than adding a parser. The plugin-customization ADRs are the worked example.

- **The platform's fixed rules.** Before any option, list what cspell fixes and this repo can't change: how
  parsers are registered, referred to, and ordered, and what a parser is told. Write them in the first ADR's
  Context. Many later questions are settled by pointing back at them.
- **Principles before mechanics.** Agree on the principles first (for example, "judge everything from the
  plugin user's config", "an operation changes only what it names") and record them as ADR `0001`. Later
  options are then weighed against them rather than argued from scratch. Principles usually outlive the
  feature: when it's archived, they move to `docs/design-principles.md`, and any that are already there
  should be cited rather than restated.
- **The user's code for each option.** Ask with what a user writes and what happens, not with type
  signatures.
- **Mutability and identity.** What does the user hold, can they change it by accident, and what happens to
  the original when they customize a copy?
- **Order and conflicts.** When two things claim the same name or file type, which wins, and is that
  visible to the user?
- **Errors.** Which mistakes throw, when (when the config loads, or on first parse), and how does the message
  reach the user? Check how cspell reports it. JS configs don't see type errors, so decide which misuse
  needs a runtime check.
- **Public surface.** Which exports and subpaths are public API, and which are experimental? This decides
  what counts as a breaking change later.
- **Impact on each stakeholder.** For each option, go back to the stakeholders from group 0: whose config
  or code changes, what breaks, and how they find out (a type error, a runtime error, a release note).
- **Migration.** How do the new and old APIs coexist, in what order do packages move, and what happens to
  the old forms: kept, deprecated, or removed, and when?
- **Provisional names.** Which names are placeholders? List them in the feature index, with when each must
  be decided.
- **Deliverables beyond ADRs.** Does the design need a guide for plugin authors, README sections, or
  samples? Name them as deliverables in the feature index.

## 2. Parser behavior

For a design that changes what an existing parser emits (file types, tags, backend, edge cases, tests and
samples, release surface), use groups 2–7 of the `new-parser-plugin` skill's
`references/parser-interview-guide.md`. A brand-new parser package uses that skill instead of this one.

## Wrapping a topic into a decision

Not every answered question needs its own ADR. Bundle related answers from the same group into one ADR when
they'd only make sense read together (e.g. the whole tag set from group 3 is usually one ADR); split them
when they're independently changeable later (backend choice and file-type coverage almost always warrant
separate ADRs, since one can change without the other).
