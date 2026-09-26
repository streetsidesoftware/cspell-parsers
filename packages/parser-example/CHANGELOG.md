# Changelog

## [1.2.1](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.2.0...@cspell/parser-example@1.2.1) (2026-09-26)


### Updates and Bug Fixes

* remove the experimental ./parser subpath; use plugin.getParser(name) instead ([0f2abd8](https://github.com/streetsidesoftware/cspell-parsers/commit/0f2abd838cb3284023823bf9750990acba7670a9))

## [1.2.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.1.5...@cspell/parser-example@1.2.0) (2026-09-26)


### Features

* **parser-example:** add catch-all `code` tag ([#147](https://github.com/streetsidesoftware/cspell-parsers/issues/147)) ([0364dfb](https://github.com/streetsidesoftware/cspell-parsers/commit/0364dfb15cd0653c8cffea96bd50552e6aa34990))
* **parser-example:** move to the IPluginEx plugin API ([#171](https://github.com/streetsidesoftware/cspell-parsers/issues/171)) ([7c2062f](https://github.com/streetsidesoftware/cspell-parsers/commit/7c2062f531d2475e7b77f41e4a2e50c3ced1a778))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* keep recommendedLanguageSettings in sync when customizePlugin renames a parser ([#155](https://github.com/streetsidesoftware/cspell-parsers/issues/155)) ([3989951](https://github.com/streetsidesoftware/cspell-parsers/commit/3989951a8a1baa5150a94c85bfa237919d904d6b))
* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))

## [1.1.5](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.1.4...@cspell/parser-example@1.1.5) (2026-09-21)


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* **parser-example:** move tags into tags.ts, generate README table ([#113](https://github.com/streetsidesoftware/cspell-parsers/issues/113)) ([81e3d3b](https://github.com/streetsidesoftware/cspell-parsers/commit/81e3d3b4b3883fe4ac0c93e9974692228b8c773e))

## [1.1.4](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.1.3...@cspell/parser-example@1.1.4) (2026-09-17)


### Updates and Bug Fixes

* Add customizable parser name and example ([#57](https://github.com/streetsidesoftware/cspell-parsers/issues/57)) ([f7990d2](https://github.com/streetsidesoftware/cspell-parsers/commit/f7990d23a79dc124713be6839b0eb716ae53709c))

## [1.1.3](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.1.2...@cspell/parser-example@1.1.3) (2026-09-17)


### Updates and Bug Fixes

* Use images from streetsidesoftware.com ([#55](https://github.com/streetsidesoftware/cspell-parsers/issues/55)) ([c8537d8](https://github.com/streetsidesoftware/cspell-parsers/commit/c8537d8049736ed57a6cd1fa14c0dc0f83ff1753))

## [1.1.2](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.1.1...@cspell/parser-example@1.1.2) (2026-09-17)


### Updates and Bug Fixes

* Update the sponsor banner. ([#53](https://github.com/streetsidesoftware/cspell-parsers/issues/53)) ([7cb119f](https://github.com/streetsidesoftware/cspell-parsers/commit/7cb119f3d204b4d1a4c72459a8787ef003807a1d))

## [1.1.1](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.1.0...@cspell/parser-example@1.1.1) (2026-09-16)


### Updates and Bug Fixes

* Add customize docs ([#35](https://github.com/streetsidesoftware/cspell-parsers/issues/35)) ([670662e](https://github.com/streetsidesoftware/cspell-parsers/commit/670662e2d26bfd50c42d06a22ed3f578058234ac))
* Add keywords to packages ([#39](https://github.com/streetsidesoftware/cspell-parsers/issues/39)) ([6605844](https://github.com/streetsidesoftware/cspell-parsers/commit/6605844d3026a09dbdb7126fcd6490be0045d6c8))
* Add list of supported file types ([#37](https://github.com/streetsidesoftware/cspell-parsers/issues/37)) ([fdeeea5](https://github.com/streetsidesoftware/cspell-parsers/commit/fdeeea55026a273db39adbf09d50054c715a2a4f))
* take control over the customization options ([#42](https://github.com/streetsidesoftware/cspell-parsers/issues/42)) ([5f18527](https://github.com/streetsidesoftware/cspell-parsers/commit/5f18527070e808d0e784dbea20b2309a0665bd2c))
* Transform comments ([#40](https://github.com/streetsidesoftware/cspell-parsers/issues/40)) ([5294d26](https://github.com/streetsidesoftware/cspell-parsers/commit/5294d264bac8d1b744536e0ed9b392787e2fbccb))

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.0.2...@cspell/parser-example@1.1.0) (2026-09-15)


### Features

* Be able to customize plugins ([#34](https://github.com/streetsidesoftware/cspell-parsers/issues/34)) ([e86c7f7](https://github.com/streetsidesoftware/cspell-parsers/commit/e86c7f7fa213a464e94cc9a5f3a03be009952269))


### Updates and Bug Fixes

* Move cspell-types to a dev dep. ([#32](https://github.com/streetsidesoftware/cspell-parsers/issues/32)) ([d4edda0](https://github.com/streetsidesoftware/cspell-parsers/commit/d4edda0d08ec0b6df8cc09c6e861a02451919104))

## [1.0.2](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.0.1...@cspell/parser-example@1.0.2) (2026-09-15)


### Updates and Bug Fixes

* Update README.md ([#29](https://github.com/streetsidesoftware/cspell-parsers/issues/29)) ([7eb7d4b](https://github.com/streetsidesoftware/cspell-parsers/commit/7eb7d4b5ff96ed9651ed04acb50c65c31ce48f2c))

## [1.0.1](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-example@1.0.0...@cspell/parser-example@1.0.1) (2026-09-15)


### Updates and Bug Fixes

* Update package repository and files ([#26](https://github.com/streetsidesoftware/cspell-parsers/issues/26)) ([2079870](https://github.com/streetsidesoftware/cspell-parsers/commit/2079870bc582fcd8ed3749d8f9a19a9dfd3f669d))

## 1.0.0 (2026-09-15)


### Updates and Bug Fixes

* Add tags to README ([#16](https://github.com/streetsidesoftware/cspell-parsers/issues/16)) ([8a30639](https://github.com/streetsidesoftware/cspell-parsers/commit/8a30639c811bd93deaeca712b590da0b8b241d9a))
* Improve tags ([#14](https://github.com/streetsidesoftware/cspell-parsers/issues/14)) ([d3bce96](https://github.com/streetsidesoftware/cspell-parsers/commit/d3bce9668bbb0a9ccfa0ae1484ea0d02b63fee55))
