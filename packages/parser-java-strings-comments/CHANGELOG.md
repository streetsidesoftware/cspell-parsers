# Changelog

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-java-strings-comments@1.0.0...@cspell/parser-java-strings-comments@1.1.0) (2026-09-26)


### Features

* **parser-java-strings-comments:** add catch-all `code` tag ([#130](https://github.com/streetsidesoftware/cspell-parsers/issues/130)) ([f66a2e2](https://github.com/streetsidesoftware/cspell-parsers/commit/f66a2e23c1ae8aee815ed0b60d3f382a2d8650da))
* **parser-java-strings-comments:** move to the IPluginEx plugin API ([#184](https://github.com/streetsidesoftware/cspell-parsers/issues/184)) ([4ec07b4](https://github.com/streetsidesoftware/cspell-parsers/commit/4ec07b45c82cd443c314d2214c527bb19e6b3955))
* **parser-typescript-strings-comments:** one parser for JavaScript and one for TypeScript ([#195](https://github.com/streetsidesoftware/cspell-parsers/issues/195)) ([91bfef9](https://github.com/streetsidesoftware/cspell-parsers/commit/91bfef92f2aa5130b75c62c7d63338751f2a19f0))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* keep recommendedLanguageSettings in sync when customizePlugin renames a parser ([#155](https://github.com/streetsidesoftware/cspell-parsers/issues/155)) ([3989951](https://github.com/streetsidesoftware/cspell-parsers/commit/3989951a8a1baa5150a94c85bfa237919d904d6b))
* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))

## 1.0.0 (2026-09-21)


### Features

* Add @cspell/parser-java-strings-comments ([#67](https://github.com/streetsidesoftware/cspell-parsers/issues/67)) ([31f207c](https://github.com/streetsidesoftware/cspell-parsers/commit/31f207c248dc5d5d067f85563506fb82f43a0d73))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* **parser-java-strings-comments:** move tags into tags.ts, generate README table ([#106](https://github.com/streetsidesoftware/cspell-parsers/issues/106)) ([4f5ba15](https://github.com/streetsidesoftware/cspell-parsers/commit/4f5ba153d436289f27f9929f26ec4c1475ea13a4))
