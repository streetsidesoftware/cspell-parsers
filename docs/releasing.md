# Releasing

How packages in this repo get versioned and published. Nothing here is done by hand: conventional commits drive
it.

## The flow

1. **release-please opens a release PR.** `.github/workflows/release-please.yml` bumps versions and changelogs
   from conventional commits, for each package in `release-please-config.json`'s `packages` map. Versions are
   tracked in `.release-please-manifest.json`.
2. **Merging the release PR tags the root package** as `cspell-parsers@x.y.z`, from the `"."` entry. The
   `tag-separator: "@"` and `include-v-in-tag: false` settings give that format.
3. **The tag triggers publishing.** `.github/workflows/publish.yml` runs
   `lerna publish from-package --no-private`, which publishes every workspace package whose version changed and
   skips `private: true` ones.

## Rules

- **Only publishable packages need a `release-please-config.json` entry**, so their version and changelog are
  tracked. Private packages don't, since lerna skips them anyway.
- **The `"."` entry always stays.** It produces the tag that triggers publishing, even though the root package
  is private and never published.
- **Never hand-edit `release-please-config.json`'s `packages` map.** `fix-release-please-config` regenerates it
  from every `packages/parser*/package.json`, adding any package whose name doesn't start with `@internal`.
  `pnpm run lint` runs it, and `pnpm run lint-ci` checks it. A new package is picked up the next time
  `pnpm run lint` runs.
- **Never add a new package to `.release-please-manifest.json`.** The manifest records each package's last
  released version, and the next release is a bump from it. Seeding a never-released package (at `1.0.0`, say)
  makes its first real release land above `1.0.0`. release-please adds the entry itself on the first release;
  the `release-please-config.json` entry is enough for it to start the package at `1.0.0`.

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the commit conventions.
