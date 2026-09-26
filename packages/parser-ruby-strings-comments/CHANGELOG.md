# Changelog

## [1.1.1](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-ruby-strings-comments@1.1.0...@cspell/parser-ruby-strings-comments@1.1.1) (2026-09-26)


### Updates and Bug Fixes

* remove the experimental ./parser subpath; use plugin.getParser(name) instead ([0f2abd8](https://github.com/streetsidesoftware/cspell-parsers/commit/0f2abd838cb3284023823bf9750990acba7670a9))

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-ruby-strings-comments@1.0.0...@cspell/parser-ruby-strings-comments@1.1.0) (2026-09-26)


### Features

* **parser-ruby-strings-comments:** add catch-all `code` tag ([#138](https://github.com/streetsidesoftware/cspell-parsers/issues/138)) ([7b10097](https://github.com/streetsidesoftware/cspell-parsers/commit/7b1009763ff099949f9a5c1df6f5ade3e59a39ba))
* **parser-ruby-strings-comments:** move to the IPluginEx plugin API ([#186](https://github.com/streetsidesoftware/cspell-parsers/issues/186)) ([6457d0b](https://github.com/streetsidesoftware/cspell-parsers/commit/6457d0b2eaf1321c7aa2db5c55b1138b93d48b76))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* keep recommendedLanguageSettings in sync when customizePlugin renames a parser ([#155](https://github.com/streetsidesoftware/cspell-parsers/issues/155)) ([3989951](https://github.com/streetsidesoftware/cspell-parsers/commit/3989951a8a1baa5150a94c85bfa237919d904d6b))
* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))

## 1.0.0 (2026-09-21)


### Features

* Add @cspell/parser-ruby-strings-comments ([#70](https://github.com/streetsidesoftware/cspell-parsers/issues/70)) ([0a648c9](https://github.com/streetsidesoftware/cspell-parsers/commit/0a648c985d29600353cb0812572ee175e7c5ce81))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* **parser-ruby-strings-comments:** move tags into tags.ts, generate README table ([#108](https://github.com/streetsidesoftware/cspell-parsers/issues/108)) ([6fa0aef](https://github.com/streetsidesoftware/cspell-parsers/commit/6fa0aef00ee5805f993068113fd9e44009939c53))
