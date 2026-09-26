# Changelog

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-php-strings-comments@1.0.0...@cspell/parser-php-strings-comments@1.1.0) (2026-09-26)


### Features

* **parser-php-strings-comments:** move to the IPluginEx plugin API ([#170](https://github.com/streetsidesoftware/cspell-parsers/issues/170)) ([836c20d](https://github.com/streetsidesoftware/cspell-parsers/commit/836c20d2569a9d9105a94d999c4b9e21107081cb))
* **parser-php-strings-comments:** use defineConfig ([#174](https://github.com/streetsidesoftware/cspell-parsers/issues/174)) ([cda75c9](https://github.com/streetsidesoftware/cspell-parsers/commit/cda75c939f15bebb91eb2ed2f811ca303bfe1e8f))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* keep recommendedLanguageSettings in sync when customizePlugin renames a parser ([#155](https://github.com/streetsidesoftware/cspell-parsers/issues/155)) ([3989951](https://github.com/streetsidesoftware/cspell-parsers/commit/3989951a8a1baa5150a94c85bfa237919d904d6b))
* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))

## 1.0.0 (2026-09-21)


### Features

* Add @cspell/parser-php-strings-comments ([#68](https://github.com/streetsidesoftware/cspell-parsers/issues/68)) ([4be05ad](https://github.com/streetsidesoftware/cspell-parsers/commit/4be05ad14bd3fe43c490e81714a61a3aecdc8f4e))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* Use PluginParser class to create parsers and allow customization. ([#102](https://github.com/streetsidesoftware/cspell-parsers/issues/102)) ([40db27b](https://github.com/streetsidesoftware/cspell-parsers/commit/40db27be8f561ddc1d2170ce0044ff5b79b0058e))
