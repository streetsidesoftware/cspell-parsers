# Changelog

## [1.1.1](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-python-strings-comments@1.1.0...@cspell/parser-python-strings-comments@1.1.1) (2026-09-26)


### Updates and Bug Fixes

* remove the experimental ./parser subpath; use plugin.getParser(name) instead ([0f2abd8](https://github.com/streetsidesoftware/cspell-parsers/commit/0f2abd838cb3284023823bf9750990acba7670a9))

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-python-strings-comments@1.0.0...@cspell/parser-python-strings-comments@1.1.0) (2026-09-26)


### Features

* **parser-python-strings-comments:** add catch-all `code` tag ([#131](https://github.com/streetsidesoftware/cspell-parsers/issues/131)) ([c612931](https://github.com/streetsidesoftware/cspell-parsers/commit/c612931b39765a770734552bc8ba0aa90e697d81))
* **parser-python-strings-comments:** move to the IPluginEx plugin API ([#185](https://github.com/streetsidesoftware/cspell-parsers/issues/185)) ([d900dd9](https://github.com/streetsidesoftware/cspell-parsers/commit/d900dd993f46306e159ee6e09da16de7a5650fc1))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* keep recommendedLanguageSettings in sync when customizePlugin renames a parser ([#155](https://github.com/streetsidesoftware/cspell-parsers/issues/155)) ([3989951](https://github.com/streetsidesoftware/cspell-parsers/commit/3989951a8a1baa5150a94c85bfa237919d904d6b))
* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))

## 1.0.0 (2026-09-21)


### Features

* Add @cspell/parser-python-strings-comments ([#69](https://github.com/streetsidesoftware/cspell-parsers/issues/69)) ([bc47ba1](https://github.com/streetsidesoftware/cspell-parsers/commit/bc47ba17689cae1ab756cc565ddd7bf4a7ee0c0d))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* **parser-python-strings-comments:** move tags into tags.ts, generate README table ([#107](https://github.com/streetsidesoftware/cspell-parsers/issues/107)) ([653c940](https://github.com/streetsidesoftware/cspell-parsers/commit/653c9401856eada8fc446c88b351dbd20294c053))
