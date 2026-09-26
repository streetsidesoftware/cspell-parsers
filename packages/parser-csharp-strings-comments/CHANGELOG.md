# Changelog

## [1.1.1](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-csharp-strings-comments@1.1.0...@cspell/parser-csharp-strings-comments@1.1.1) (2026-09-26)


### Updates and Bug Fixes

* remove the experimental ./parser subpath; use plugin.getParser(name) instead ([0f2abd8](https://github.com/streetsidesoftware/cspell-parsers/commit/0f2abd838cb3284023823bf9750990acba7670a9))

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-csharp-strings-comments@1.0.0...@cspell/parser-csharp-strings-comments@1.1.0) (2026-09-26)


### Features

* **parser-csharp-strings-comments:** add catch-all `code` tag ([#128](https://github.com/streetsidesoftware/cspell-parsers/issues/128)) ([82a534b](https://github.com/streetsidesoftware/cspell-parsers/commit/82a534b39128920f07ad5cdb77d707e2267a9cf8))
* **parser-csharp-strings-comments:** move to the IPluginEx plugin API ([#182](https://github.com/streetsidesoftware/cspell-parsers/issues/182)) ([f46aeeb](https://github.com/streetsidesoftware/cspell-parsers/commit/f46aeebe2d076dbb0c2f2c2cc34460752183e760))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* keep recommendedLanguageSettings in sync when customizePlugin renames a parser ([#155](https://github.com/streetsidesoftware/cspell-parsers/issues/155)) ([3989951](https://github.com/streetsidesoftware/cspell-parsers/commit/3989951a8a1baa5150a94c85bfa237919d904d6b))
* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))

## 1.0.0 (2026-09-21)


### Features

* Add @cspell/parser-csharp-strings-comments ([#65](https://github.com/streetsidesoftware/cspell-parsers/issues/65)) ([46c197b](https://github.com/streetsidesoftware/cspell-parsers/commit/46c197b603e57083a366f9b256bfd3e6d81624f6))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* **parser-csharp-strings-comments:** move tags into tags.ts, generate README table ([#104](https://github.com/streetsidesoftware/cspell-parsers/issues/104)) ([7ffdf35](https://github.com/streetsidesoftware/cspell-parsers/commit/7ffdf352940e0ae3d6a929c441c3058fbd056c43))
