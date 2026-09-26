# Changelog

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-typescript-strings-comments@1.0.0...@cspell/parser-typescript-strings-comments@1.1.0) (2026-09-26)


### Features

* **parser-example:** move to the IPluginEx plugin API ([#171](https://github.com/streetsidesoftware/cspell-parsers/issues/171)) ([7c2062f](https://github.com/streetsidesoftware/cspell-parsers/commit/7c2062f531d2475e7b77f41e4a2e50c3ced1a778))
* **parser-typescript-strings-comments:** add catch-all `code` tag ([#140](https://github.com/streetsidesoftware/cspell-parsers/issues/140)) ([987547f](https://github.com/streetsidesoftware/cspell-parsers/commit/987547f76f482295846f3cc06011637e7dc094e0))
* **parser-typescript-strings-comments:** add plugin.defineConfig and filterTagsForFileType ([#172](https://github.com/streetsidesoftware/cspell-parsers/issues/172)) ([a7cf082](https://github.com/streetsidesoftware/cspell-parsers/commit/a7cf082dcbb4c71d6caeb145ad639c65e5dd83b0))
* **parser-typescript-strings-comments:** move to the IPluginEx plugin API ([#167](https://github.com/streetsidesoftware/cspell-parsers/issues/167)) ([36204e2](https://github.com/streetsidesoftware/cspell-parsers/commit/36204e27ce8adf313fd5d9de20a0fd0d907b8a4d))
* **parser-typescript-strings-comments:** one parser for JavaScript and one for TypeScript ([#195](https://github.com/streetsidesoftware/cspell-parsers/issues/195)) ([91bfef9](https://github.com/streetsidesoftware/cspell-parsers/commit/91bfef92f2aa5130b75c62c7d63338751f2a19f0))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* keep recommendedLanguageSettings in sync when customizePlugin renames a parser ([#155](https://github.com/streetsidesoftware/cspell-parsers/issues/155)) ([3989951](https://github.com/streetsidesoftware/cspell-parsers/commit/3989951a8a1baa5150a94c85bfa237919d904d6b))
* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))

## 1.0.0 (2026-09-21)


### Features

* Add @cspell/parser-typescript-strings-comments (JS/JSX/TS/TSX) ([#62](https://github.com/streetsidesoftware/cspell-parsers/issues/62)) ([353cf23](https://github.com/streetsidesoftware/cspell-parsers/commit/353cf2302e0c0a072f86f9e20f6a5441dcd821e1))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* **parser-typescript-strings-comments:** move tags into tags.ts, generate README table ([#110](https://github.com/streetsidesoftware/cspell-parsers/issues/110)) ([4a3580a](https://github.com/streetsidesoftware/cspell-parsers/commit/4a3580aa88544965918760535155deba965be24d))
