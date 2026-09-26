# Changelog

## [1.1.0](https://github.com/streetsidesoftware/cspell-parsers/compare/@cspell/parser-strings-comments@1.0.0...@cspell/parser-strings-comments@1.1.0) (2026-09-26)


### Features

* **parser-c-cpp-strings-comments:** move to the IPluginEx plugin API ([#181](https://github.com/streetsidesoftware/cspell-parsers/issues/181)) ([50e095e](https://github.com/streetsidesoftware/cspell-parsers/commit/50e095e7084a4160fd9b5badca14bc8a8452c8cd))
* **parser-csharp-strings-comments:** move to the IPluginEx plugin API ([#182](https://github.com/streetsidesoftware/cspell-parsers/issues/182)) ([f46aeeb](https://github.com/streetsidesoftware/cspell-parsers/commit/f46aeebe2d076dbb0c2f2c2cc34460752183e760))
* **parser-go-strings-comments:** move to the IPluginEx plugin API ([#183](https://github.com/streetsidesoftware/cspell-parsers/issues/183)) ([d9a7202](https://github.com/streetsidesoftware/cspell-parsers/commit/d9a72024b5b098421ff83264a6d50ec9ae76d676))
* **parser-java-strings-comments:** move to the IPluginEx plugin API ([#184](https://github.com/streetsidesoftware/cspell-parsers/issues/184)) ([4ec07b4](https://github.com/streetsidesoftware/cspell-parsers/commit/4ec07b45c82cd443c314d2214c527bb19e6b3955))
* **parser-php-strings-comments:** move to the IPluginEx plugin API ([#170](https://github.com/streetsidesoftware/cspell-parsers/issues/170)) ([836c20d](https://github.com/streetsidesoftware/cspell-parsers/commit/836c20d2569a9d9105a94d999c4b9e21107081cb))
* **parser-python-strings-comments:** move to the IPluginEx plugin API ([#185](https://github.com/streetsidesoftware/cspell-parsers/issues/185)) ([d900dd9](https://github.com/streetsidesoftware/cspell-parsers/commit/d900dd993f46306e159ee6e09da16de7a5650fc1))
* **parser-ruby-strings-comments:** move to the IPluginEx plugin API ([#186](https://github.com/streetsidesoftware/cspell-parsers/issues/186)) ([6457d0b](https://github.com/streetsidesoftware/cspell-parsers/commit/6457d0b2eaf1321c7aa2db5c55b1138b93d48b76))
* **parser-rust-strings-comments:** move to the IPluginEx plugin API ([#187](https://github.com/streetsidesoftware/cspell-parsers/issues/187)) ([dd1a924](https://github.com/streetsidesoftware/cspell-parsers/commit/dd1a924291a83085671d2f09f7cc0f79d43a2aba))
* **parser-strings-comments:** move to the IPluginEx plugin API ([#188](https://github.com/streetsidesoftware/cspell-parsers/issues/188)) ([f31d745](https://github.com/streetsidesoftware/cspell-parsers/commit/f31d745970ad1d958d770bc701c7835d85b81c73))
* **parser-typescript-strings-comments:** move to the IPluginEx plugin API ([#167](https://github.com/streetsidesoftware/cspell-parsers/issues/167)) ([36204e2](https://github.com/streetsidesoftware/cspell-parsers/commit/36204e27ce8adf313fd5d9de20a0fd0d907b8a4d))
* **parser-typescript-strings-comments:** one parser for JavaScript and one for TypeScript ([#195](https://github.com/streetsidesoftware/cspell-parsers/issues/195)) ([91bfef9](https://github.com/streetsidesoftware/cspell-parsers/commit/91bfef92f2aa5130b75c62c7d63338751f2a19f0))
* remove the deprecated customization forms ([#194](https://github.com/streetsidesoftware/cspell-parsers/issues/194)) ([0130783](https://github.com/streetsidesoftware/cspell-parsers/commit/01307836f08ee6140b1ce9a58625ec5d120998fa))


### Updates and Bug Fixes

* **parser-php-strings-comments:** don't spell check HTML by default ([#153](https://github.com/streetsidesoftware/cspell-parsers/issues/153)) ([4504989](https://github.com/streetsidesoftware/cspell-parsers/commit/4504989092a8ad518cdf09051ebc84d4a47d6028))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cspell/parser-c-cpp-strings-comments bumped to 1.1.0
    * @cspell/parser-csharp-strings-comments bumped to 1.1.0
    * @cspell/parser-go-strings-comments bumped to 1.1.0
    * @cspell/parser-java-strings-comments bumped to 1.1.0
    * @cspell/parser-php-strings-comments bumped to 1.1.0
    * @cspell/parser-python-strings-comments bumped to 1.1.0
    * @cspell/parser-ruby-strings-comments bumped to 1.1.0
    * @cspell/parser-rust-strings-comments bumped to 1.1.0
    * @cspell/parser-typescript-strings-comments bumped to 1.1.0

## 1.0.0 (2026-09-21)


### Features

* Add @cspell/parser-strings-comments (C, C++, C#, Go, Java, JS/JSX, TS/TSX, PHP) ([#60](https://github.com/streetsidesoftware/cspell-parsers/issues/60)) ([293e02b](https://github.com/streetsidesoftware/cspell-parsers/commit/293e02bdcb42a080b8cb71694deb801f1cad3731))


### Updates and Bug Fixes

* Add PluginParser type ([#98](https://github.com/streetsidesoftware/cspell-parsers/issues/98)) ([ad433fc](https://github.com/streetsidesoftware/cspell-parsers/commit/ad433fcf64f2377ae849914eca4a6fe972d89d97))
* Use `parser-*-string-comments` parsers for `parser-strings-commets` ([#94](https://github.com/streetsidesoftware/cspell-parsers/issues/94)) ([31f48a2](https://github.com/streetsidesoftware/cspell-parsers/commit/31f48a29b6d72d10ffd1059ec3b0ff1a3b7837e3))


### Code Refactoring

* Use PluginParser class to create parsers and allow customization. ([#102](https://github.com/streetsidesoftware/cspell-parsers/issues/102)) ([40db27b](https://github.com/streetsidesoftware/cspell-parsers/commit/40db27be8f561ddc1d2170ce0044ff5b79b0058e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @cspell/parser-c-cpp-strings-comments bumped to 1.0.0
    * @cspell/parser-csharp-strings-comments bumped to 1.0.0
    * @cspell/parser-go-strings-comments bumped to 1.0.0
    * @cspell/parser-java-strings-comments bumped to 1.0.0
    * @cspell/parser-php-strings-comments bumped to 1.0.0
    * @cspell/parser-python-strings-comments bumped to 1.0.0
    * @cspell/parser-ruby-strings-comments bumped to 1.0.0
    * @cspell/parser-rust-strings-comments bumped to 1.0.0
    * @cspell/parser-typescript-strings-comments bumped to 1.0.0
