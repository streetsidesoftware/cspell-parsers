# Changelog

## [1.2.0](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.1.5...cspell-parsers@1.2.0) (2026-09-21)


### Features

* Add @cspell/parser-c-cpp-strings-comments ([#64](https://github.com/streetsidesoftware/cspell-parsers/issues/64)) ([78b6225](https://github.com/streetsidesoftware/cspell-parsers/commit/78b6225a55c118d9b4fe6ef319dc11d43116bbd2))
* Add @cspell/parser-csharp-strings-comments ([#65](https://github.com/streetsidesoftware/cspell-parsers/issues/65)) ([46c197b](https://github.com/streetsidesoftware/cspell-parsers/commit/46c197b603e57083a366f9b256bfd3e6d81624f6))
* Add @cspell/parser-go-strings-comments ([#66](https://github.com/streetsidesoftware/cspell-parsers/issues/66)) ([4e8962b](https://github.com/streetsidesoftware/cspell-parsers/commit/4e8962b923ebfdd388fdb0bf343bca321d13713e))
* Add @cspell/parser-java-strings-comments ([#67](https://github.com/streetsidesoftware/cspell-parsers/issues/67)) ([31f207c](https://github.com/streetsidesoftware/cspell-parsers/commit/31f207c248dc5d5d067f85563506fb82f43a0d73))
* Add @cspell/parser-php-strings-comments ([#68](https://github.com/streetsidesoftware/cspell-parsers/issues/68)) ([4be05ad](https://github.com/streetsidesoftware/cspell-parsers/commit/4be05ad14bd3fe43c490e81714a61a3aecdc8f4e))
* Add @cspell/parser-python-strings-comments ([#69](https://github.com/streetsidesoftware/cspell-parsers/issues/69)) ([bc47ba1](https://github.com/streetsidesoftware/cspell-parsers/commit/bc47ba17689cae1ab756cc565ddd7bf4a7ee0c0d))
* Add @cspell/parser-ruby-strings-comments ([#70](https://github.com/streetsidesoftware/cspell-parsers/issues/70)) ([0a648c9](https://github.com/streetsidesoftware/cspell-parsers/commit/0a648c985d29600353cb0812572ee175e7c5ce81))
* Add @cspell/parser-rust-strings-comments ([#72](https://github.com/streetsidesoftware/cspell-parsers/issues/72)) ([ea33e16](https://github.com/streetsidesoftware/cspell-parsers/commit/ea33e1679d13ae8e7bd0a3228f7f7f88c4bce515))
* Add @cspell/parser-strings-comments (C, C++, C#, Go, Java, JS/JSX, TS/TSX, PHP) ([#60](https://github.com/streetsidesoftware/cspell-parsers/issues/60)) ([293e02b](https://github.com/streetsidesoftware/cspell-parsers/commit/293e02bdcb42a080b8cb71694deb801f1cad3731))
* Add @cspell/parser-typescript-strings-comments (JS/JSX/TS/TSX) ([#62](https://github.com/streetsidesoftware/cspell-parsers/issues/62)) ([353cf23](https://github.com/streetsidesoftware/cspell-parsers/commit/353cf2302e0c0a072f86f9e20f6a5441dcd821e1))
* **parser-typescript-tree-sitter,parser-typescript:** publish tags.ts as a ./tags export ([#120](https://github.com/streetsidesoftware/cspell-parsers/issues/120)) ([3f496b5](https://github.com/streetsidesoftware/cspell-parsers/commit/3f496b59c573ee4ae1c89b15ea10cccaf2bcbfe8))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Freeze global tags ([#96](https://github.com/streetsidesoftware/cspell-parsers/issues/96)) ([6795ca3](https://github.com/streetsidesoftware/cspell-parsers/commit/6795ca315e5c2509353e05c90dbf9f4debccc4d5))
* **test-packages:** avoid DEP0190 when spawning pnpm on Windows ([#123](https://github.com/streetsidesoftware/cspell-parsers/issues/123)) ([e25c6c0](https://github.com/streetsidesoftware/cspell-parsers/commit/e25c6c031f1010cf22428306b12dcd10fb28440d))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))
* Use a common method to create parsers. ([#99](https://github.com/streetsidesoftware/cspell-parsers/issues/99)) ([f1f34b8](https://github.com/streetsidesoftware/cspell-parsers/commit/f1f34b8da70eec258b3ed0f311b16f81bc7aa8b1))


### Code Refactoring

* **parser-c-cpp-strings-comments:** move tags into tags.ts, generate README table ([#103](https://github.com/streetsidesoftware/cspell-parsers/issues/103)) ([c729de2](https://github.com/streetsidesoftware/cspell-parsers/commit/c729de2d70dbf0d06c93e30dacb7937a88c39eba))
* **parser-csharp-strings-comments:** move tags into tags.ts, generate README table ([#104](https://github.com/streetsidesoftware/cspell-parsers/issues/104)) ([7ffdf35](https://github.com/streetsidesoftware/cspell-parsers/commit/7ffdf352940e0ae3d6a929c441c3058fbd056c43))
* **parser-example:** move tags into tags.ts, generate README table ([#113](https://github.com/streetsidesoftware/cspell-parsers/issues/113)) ([81e3d3b](https://github.com/streetsidesoftware/cspell-parsers/commit/81e3d3b4b3883fe4ac0c93e9974692228b8c773e))
* **parser-go-strings-comments:** move tags into tags.ts, generate README table ([#105](https://github.com/streetsidesoftware/cspell-parsers/issues/105)) ([44d29fc](https://github.com/streetsidesoftware/cspell-parsers/commit/44d29fc3e67e6948a4eeea98b91bec4741033962))
* **parser-java-strings-comments:** move tags into tags.ts, generate README table ([#106](https://github.com/streetsidesoftware/cspell-parsers/issues/106)) ([4f5ba15](https://github.com/streetsidesoftware/cspell-parsers/commit/4f5ba153d436289f27f9929f26ec4c1475ea13a4))
* **parser-javascript:** reuse tags exported by parser-typescript ([#118](https://github.com/streetsidesoftware/cspell-parsers/issues/118)) ([876ed5c](https://github.com/streetsidesoftware/cspell-parsers/commit/876ed5c8da57bd4df5219bf4cdd69ec33e86f45e))
* **parser-python-strings-comments:** move tags into tags.ts, generate README table ([#107](https://github.com/streetsidesoftware/cspell-parsers/issues/107)) ([653c940](https://github.com/streetsidesoftware/cspell-parsers/commit/653c9401856eada8fc446c88b351dbd20294c053))
* **parser-ruby-strings-comments:** move tags into tags.ts, generate README table ([#108](https://github.com/streetsidesoftware/cspell-parsers/issues/108)) ([6fa0aef](https://github.com/streetsidesoftware/cspell-parsers/commit/6fa0aef00ee5805f993068113fd9e44009939c53))
* **parser-rust-strings-comments:** move tags into tags.ts, generate README table ([#109](https://github.com/streetsidesoftware/cspell-parsers/issues/109)) ([deba58f](https://github.com/streetsidesoftware/cspell-parsers/commit/deba58fd17b89bbec4c432352309482c637b0d9e))
* **parser-typescript-strings-comments:** move tags into tags.ts, generate README table ([#110](https://github.com/streetsidesoftware/cspell-parsers/issues/110)) ([4a3580a](https://github.com/streetsidesoftware/cspell-parsers/commit/4a3580aa88544965918760535155deba965be24d))
* **parser-typescript-tree-sitter-wasm:** move tags into tags.ts, generate README table ([#117](https://github.com/streetsidesoftware/cspell-parsers/issues/117)) ([39aac22](https://github.com/streetsidesoftware/cspell-parsers/commit/39aac223a7eaa270971b6a0af5539e5a43c18174))
* **parser-typescript-tree-sitter:** move tags into tags.ts, generate README table ([#116](https://github.com/streetsidesoftware/cspell-parsers/issues/116)) ([cc3b0d5](https://github.com/streetsidesoftware/cspell-parsers/commit/cc3b0d52d0732ea92f374d665fd8c47c42639429))
* Use PluginParser class to create parsers and allow customization. ([#102](https://github.com/streetsidesoftware/cspell-parsers/issues/102)) ([40db27b](https://github.com/streetsidesoftware/cspell-parsers/commit/40db27be8f561ddc1d2170ce0044ff5b79b0058e))

## [1.1.5](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.1.4...cspell-parsers@1.1.5) (2026-09-17)


### Updates and Bug Fixes

* Add customizable parser name and example ([#57](https://github.com/streetsidesoftware/cspell-parsers/issues/57)) ([f7990d2](https://github.com/streetsidesoftware/cspell-parsers/commit/f7990d23a79dc124713be6839b0eb716ae53709c))

## [1.1.4](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.1.3...cspell-parsers@1.1.4) (2026-09-17)


### Updates and Bug Fixes

* Use images from streetsidesoftware.com ([#55](https://github.com/streetsidesoftware/cspell-parsers/issues/55)) ([c8537d8](https://github.com/streetsidesoftware/cspell-parsers/commit/c8537d8049736ed57a6cd1fa14c0dc0f83ff1753))

## [1.1.3](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.1.2...cspell-parsers@1.1.3) (2026-09-17)


### Updates and Bug Fixes

* Update the sponsor banner. ([#53](https://github.com/streetsidesoftware/cspell-parsers/issues/53)) ([7cb119f](https://github.com/streetsidesoftware/cspell-parsers/commit/7cb119f3d204b4d1a4c72459a8787ef003807a1d))

## [1.1.2](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.1.1...cspell-parsers@1.1.2) (2026-09-17)


### Updates and Bug Fixes

* Add a tree-sitter specific version of the parser. ([#44](https://github.com/streetsidesoftware/cspell-parsers/issues/44)) ([10c0dcc](https://github.com/streetsidesoftware/cspell-parsers/commit/10c0dccb4dde9dbbd76cb6a8c12ff78fef7e4e3b))
* initial version of parser-typescript-tree-sitter-wasm ([#50](https://github.com/streetsidesoftware/cspell-parsers/issues/50)) ([1146384](https://github.com/streetsidesoftware/cspell-parsers/commit/114638457d35b73f73aa0441ca0128385e49ac9d))
* Use a single instance of Tree-sitter ([#47](https://github.com/streetsidesoftware/cspell-parsers/issues/47)) ([0ea8001](https://github.com/streetsidesoftware/cspell-parsers/commit/0ea8001b92c60b406906d90a4eef2d1cbddc6334))


### Code Refactoring

* Make tree-sitter unique per language. ([#48](https://github.com/streetsidesoftware/cspell-parsers/issues/48)) ([715dc9a](https://github.com/streetsidesoftware/cspell-parsers/commit/715dc9aab864ad19c669183f57f2ee320ed38386))
* Make typescript an alias of typescript-tree-sitter ([#46](https://github.com/streetsidesoftware/cspell-parsers/issues/46)) ([23ff2ca](https://github.com/streetsidesoftware/cspell-parsers/commit/23ff2caf9568cb517dbc7831db1a26d7d6826c91))

## [1.1.1](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.1.0...cspell-parsers@1.1.1) (2026-09-16)


### Updates and Bug Fixes

* Add customize docs ([#35](https://github.com/streetsidesoftware/cspell-parsers/issues/35)) ([670662e](https://github.com/streetsidesoftware/cspell-parsers/commit/670662e2d26bfd50c42d06a22ed3f578058234ac))
* Add keywords to packages ([#39](https://github.com/streetsidesoftware/cspell-parsers/issues/39)) ([6605844](https://github.com/streetsidesoftware/cspell-parsers/commit/6605844d3026a09dbdb7126fcd6490be0045d6c8))
* Add list of supported file types ([#37](https://github.com/streetsidesoftware/cspell-parsers/issues/37)) ([fdeeea5](https://github.com/streetsidesoftware/cspell-parsers/commit/fdeeea55026a273db39adbf09d50054c715a2a4f))
* Add package parser-javascript ([#38](https://github.com/streetsidesoftware/cspell-parsers/issues/38)) ([b86344a](https://github.com/streetsidesoftware/cspell-parsers/commit/b86344a4366d3ccd4dbd2666f70f5a357c21e37b))
* take control over the customization options ([#42](https://github.com/streetsidesoftware/cspell-parsers/issues/42)) ([5f18527](https://github.com/streetsidesoftware/cspell-parsers/commit/5f18527070e808d0e784dbea20b2309a0665bd2c))
* Transform comments ([#40](https://github.com/streetsidesoftware/cspell-parsers/issues/40)) ([5294d26](https://github.com/streetsidesoftware/cspell-parsers/commit/5294d264bac8d1b744536e0ed9b392787e2fbccb))
* Transform strings ([#41](https://github.com/streetsidesoftware/cspell-parsers/issues/41)) ([c4f38a5](https://github.com/streetsidesoftware/cspell-parsers/commit/c4f38a56cc3b6e7b0362ba1fdc1297f2e52e16dd))

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.0.3...cspell-parsers@1.1.0) (2026-09-15)


### Features

* Be able to customize plugins ([#34](https://github.com/streetsidesoftware/cspell-parsers/issues/34)) ([e86c7f7](https://github.com/streetsidesoftware/cspell-parsers/commit/e86c7f7fa213a464e94cc9a5f3a03be009952269))


### Updates and Bug Fixes

* Move cspell-types to a dev dep. ([#32](https://github.com/streetsidesoftware/cspell-parsers/issues/32)) ([d4edda0](https://github.com/streetsidesoftware/cspell-parsers/commit/d4edda0d08ec0b6df8cc09c6e861a02451919104))

## [1.0.3](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.0.2...cspell-parsers@1.0.3) (2026-09-15)


### Updates and Bug Fixes

* Update README.md ([#29](https://github.com/streetsidesoftware/cspell-parsers/issues/29)) ([7eb7d4b](https://github.com/streetsidesoftware/cspell-parsers/commit/7eb7d4b5ff96ed9651ed04acb50c65c31ce48f2c))

## [1.0.2](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.0.1...cspell-parsers@1.0.2) (2026-09-15)


### Updates and Bug Fixes

* Update package repository and files ([#26](https://github.com/streetsidesoftware/cspell-parsers/issues/26)) ([2079870](https://github.com/streetsidesoftware/cspell-parsers/commit/2079870bc582fcd8ed3749d8f9a19a9dfd3f669d))

## [1.0.1](https://github.com/streetsidesoftware/cspell-parsers/compare/cspell-parsers@1.0.0...cspell-parsers@1.0.1) (2026-09-15)


### Updates and Bug Fixes

* Update publish.yml ([#21](https://github.com/streetsidesoftware/cspell-parsers/issues/21)) ([85d5462](https://github.com/streetsidesoftware/cspell-parsers/commit/85d5462ca96118e0c3d98992d3d2feed2807a970))

## 1.0.0 (2026-09-15)


### Updates and Bug Fixes

* Add samples ([#10](https://github.com/streetsidesoftware/cspell-parsers/issues/10)) ([c7ede5b](https://github.com/streetsidesoftware/cspell-parsers/commit/c7ede5bd3ae1b728356baf6b02d9ed8be1f0e143))
* Add tags to README ([#16](https://github.com/streetsidesoftware/cspell-parsers/issues/16)) ([8a30639](https://github.com/streetsidesoftware/cspell-parsers/commit/8a30639c811bd93deaeca712b590da0b8b241d9a))
* first pass at a TypeScript parser. ([#7](https://github.com/streetsidesoftware/cspell-parsers/issues/7)) ([be0668c](https://github.com/streetsidesoftware/cspell-parsers/commit/be0668ca538ff14b7da7c781d6eb891a44d54e22))
* Improve tags ([#14](https://github.com/streetsidesoftware/cspell-parsers/issues/14)) ([d3bce96](https://github.com/streetsidesoftware/cspell-parsers/commit/d3bce9668bbb0a9ccfa0ae1484ea0d02b63fee55))
* Remove scope ([#15](https://github.com/streetsidesoftware/cspell-parsers/issues/15)) ([14dd0c1](https://github.com/streetsidesoftware/cspell-parsers/commit/14dd0c15640b334987199db7fb66f7146e01c0ab))
* Restructure the TypeScript plugin ([#9](https://github.com/streetsidesoftware/cspell-parsers/issues/9)) ([fb7771a](https://github.com/streetsidesoftware/cspell-parsers/commit/fb7771a6e08fed07de1da5617e37b78709089651))
