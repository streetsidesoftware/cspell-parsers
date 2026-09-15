# cspell-parsers

A collection of parser plugins for [cspell](https://cspell.org), published as scoped `@cspell/parser-*`
packages on npm. Each one teaches cspell how to read a specific file format, so spell checking sees only the
text that was meant to be read as words — identifiers, comments, string contents — and skips the rest
(keywords, punctuation, numeric literals, import specifiers, and so on).

## Available parsers

| Package                                                   | Description                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| [`@cspell/parser-typescript`](packages/parser-typescript) | TypeScript (`.ts`, `.mts`, `.cts`) and TSX/JSX (`.tsx`, `.jsx`) |

See each package's own README for install instructions, usage, and — where the parser emits `tags` — the
table of tags it can produce for use with cspell's `validate`/`ValidationTags` setting.

## Quick start

Every parser package works the same way: import its `recommended` settings to register the plugin and select
it for the relevant file types in one step.

```jsonc
// cspell.config.jsonc (or cspell.config.yaml/.mjs/...)
{
  "import": ["@cspell/parser-typescript/recommended"],
}
```

For more control — applying a parser to only some file types, or alongside other settings — wire the plugin
in yourself instead; see the package's README for the exact `languageId`s and parser name to use.

## Contributing

Want to add a new parser, or work on one of the ones here? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

## Support Future Development

<!--- @@inject: static/sponsor.md --->

If our spell checkers and plugins save you time, please consider supporting their development.

<p align="left">
  <a href="https://github.com/sponsors/streetsidesoftware" title="GitHub Sponsor"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cspell.org/img/sponsor/github-sponsor-dark.png" /><img alt="GitHub Sponsor" src="https://cspell.org/img/sponsor/github-sponsor.png" width="180" /></picture></a> &nbsp; <a href="https://www.paypal.com/donate/?hosted_button_id=26LNBP2Q6MKCY" title="PayPal"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cspell.org/img/sponsor/paypal-dark.png" /><img alt="PayPal" src="https://cspell.org/img/sponsor/paypal.png" width="180" /></picture></a> &nbsp; <a href="https://opencollective.com/cspell" title="Open Collective"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cspell.org/img/sponsor/open-collective-dark.png" /><img alt="Open Collective" src="https://cspell.org/img/sponsor/open-collective.png" width="180" /></picture></a> &nbsp; <a href="https://streetsidesoftware.com/sponsor/" title="Street Side Software"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cspell.org/img/sponsor/cspell-dark.png" /><img alt="CSpell" src="https://cspell.org/img/sponsor/cspell.png" width="180" /></picture></a>
</p>

<!--- @@inject-end: static/sponsor.md --->

## CSpell for Enterprise

<!--- @@inject: static/tidelift.md --->

Available as part of the Tidelift Subscription.

The maintainers of cspell and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source packages you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact packages you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-cspell?utm_source=npm-cspell&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)

<!--- @@inject-end: static/tidelift.md --->

<!--- @@inject: static/footer.md --->

<br/>

---

<p align="center">Brought to you by<a href="https://streetsidesoftware.com" title="Street Side Software"><img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software</a></p>

<!--- @@inject-end: static/footer.md --->
