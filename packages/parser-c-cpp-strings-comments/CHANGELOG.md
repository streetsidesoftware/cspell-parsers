# Changelog

## [1.1.1](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-c-cpp-strings-comments@1.1.0...@cspell/parser-c-cpp-strings-comments@1.1.1) (2026-09-26)


### Updates and Bug Fixes

* remove the experimental ./parser subpath; use plugin.getParser(name) instead ([0f2abd8](https://github.com/streetsidesoftware/cspell-parsers/commit/0f2abd838cb3284023823bf9750990acba7670a9))

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-c-cpp-strings-comments@1.0.0...@cspell/parser-c-cpp-strings-comments@1.1.0) (2026-09-26)


### Features

* **parser-c-cpp-strings-comments:** add catch-all `code` tag ([#126](https://github.com/streetsidesoftware/cspell-parsers/issues/126)) ([f5493dd](https://github.com/streetsidesoftware/cspell-parsers/commit/f5493dd1908a7867d26ec072ed83d7d6697dfa11))
* **parser-c-cpp-strings-comments:** move to the IPluginEx plugin API ([#181](https://github.com/streetsidesoftware/cspell-parsers/issues/181)) ([50e095e](https://github.com/streetsidesoftware/cspell-parsers/commit/50e095e7084a4160fd9b5badca14bc8a8452c8cd))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* keep recommendedLanguageSettings in sync when customizePlugin renames a parser ([#155](https://github.com/streetsidesoftware/cspell-parsers/issues/155)) ([3989951](https://github.com/streetsidesoftware/cspell-parsers/commit/3989951a8a1baa5150a94c85bfa237919d904d6b))
* **parser-c-cpp-strings-comments:** check digit separators in linear time ([#193](https://github.com/streetsidesoftware/cspell-parsers/issues/193)) ([52468fe](https://github.com/streetsidesoftware/cspell-parsers/commit/52468fe1c22b493b2275746042932d36a85e883f))
* **parser-c-cpp-strings-comments:** read digit separators as part of the number ([#190](https://github.com/streetsidesoftware/cspell-parsers/issues/190)) ([312ecba](https://github.com/streetsidesoftware/cspell-parsers/commit/312ecbaa6fc2b3a7bee121ffc41be15dbba48fa7))
* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))

## 1.0.0 (2026-09-21)


### Features

* Add @cspell/parser-c-cpp-strings-comments ([#64](https://github.com/streetsidesoftware/cspell-parsers/issues/64)) ([78b6225](https://github.com/streetsidesoftware/cspell-parsers/commit/78b6225a55c118d9b4fe6ef319dc11d43116bbd2))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* **parser-c-cpp-strings-comments:** move tags into tags.ts, generate README table ([#103](https://github.com/streetsidesoftware/cspell-parsers/issues/103)) ([c729de2](https://github.com/streetsidesoftware/cspell-parsers/commit/c729de2d70dbf0d06c93e30dacb7937a88c39eba))
