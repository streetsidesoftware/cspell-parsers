import type { DocumentParser, ParsedText, Parser, Plugin, ValidationTags } from '@cspell/cspell-types';

/**
 * Returns a copy of `plugin` whose parsers filter their `parsedTexts` output through `validate`
 * (the same shape as `CSpellSettingsValidation.validate`) before emitting them, rather than relying on
 * the host application to apply `validate` itself. This lets a plugin consumer opt a segment out of
 * spell checking by tag even against a cspell version that doesn't yet honor `validate`.
 *
 * Each package's `plugin.ts` wraps this in a `customizePlugin(validate)` bound to its own `plugin`, so
 * a consumer never has to pass the plugin in themselves.
 */
export function customizePlugin(plugin: Plugin, validate: ValidationTags): Plugin {
  if (!plugin.parsers) return plugin;
  return {
    ...plugin,
    parsers: plugin.parsers.map((entry) => customizeParserEntry(entry, validate)),
  };
}

function customizeParserEntry(entry: DocumentParser | Parser, validate: ValidationTags): DocumentParser | Parser {
  // DocumentParser (parseDocument-based) isn't used by any parser in this repo today; pass it through
  // unmodified rather than guessing at how to filter it.
  if (!('parse' in entry)) return entry;
  return customizeParser(entry, validate);
}

/**
 * Wraps a single `Parser` so its `parse()` output only includes `parsedTexts` selected by `validate`.
 */
export function customizeParser(parser: Parser, validate: ValidationTags): Parser {
  return {
    name: parser.name,
    parse(content, filename) {
      const result = parser.parse(content, filename);
      return {
        ...result,
        parsedTexts: filterParsedTexts(result.parsedTexts, validate),
      };
    },
  };
}

function* filterParsedTexts(parsedTexts: Iterable<ParsedText>, validate: ValidationTags): Iterable<ParsedText> {
  for (const parsedText of parsedTexts) {
    if (isValidated(parsedText, validate)) yield parsedText;
  }
}

/**
 * Decides whether `parsedText` should be validated (spell checked), mirroring
 * `CSpellSettingsValidation.validate`'s documented matching rules:
 * - tags are matched hierarchically by dot-separated segments, so a `validate` key like `comment.block`
 *   also matches the more specific tag `comment.block.doc` - unless a more specific key (`comment.block.doc`
 *   itself) is also present, which wins;
 * - a key may use `*` as a wildcard, matching any run of characters (`comment.block.*`, `comment*`, or a
 *   bare `*` matching everything);
 * - `validate['*']` (default `true`) is the fallback for any tag not otherwise matched.
 *
 * A `ParsedText`'s own `tags` already list every ancestor of its most specific tag (see each package's
 * `hierarchicalTags` helper), so hierarchical matching here just means: check every one of the segment's
 * own tags against every `validate` pattern, and let the most specific match win.
 */
function isValidated(parsedText: ParsedText, validate: ValidationTags): boolean {
  const ownTags = Object.entries(parsedText.tags ?? {})
    .filter(([, value]) => value === true || (typeof value === 'string' && value !== ''))
    .map(([tag]) => tag);

  let best: { specificity: number; value: boolean } | undefined;
  for (const tag of ownTags) {
    for (const pattern of Object.keys(validate)) {
      if (pattern === '*' || !matchesTagPattern(tag, pattern)) continue;
      const specificity = patternSpecificity(pattern);
      if (best && specificity <= best.specificity) continue;
      best = { specificity, value: validate[pattern] ?? true };
    }
  }
  if (best) return best.value;
  return validate['*'] ?? true;
}

/**
 * Higher is more specific. An exact (wildcard-free) pattern only ever matches a tag of the same length
 * (the regexp built in `matchesTagPattern` requires a full match), so using the pattern's own length as
 * its specificity naturally ranks a deeper exact tag (`comment.block.doc`) above a shallower one
 * (`comment.block`), and any exact match above a wildcard pattern with a shorter literal prefix.
 */
function patternSpecificity(pattern: string): number {
  const starIndex = pattern.indexOf('*');
  return starIndex === -1 ? pattern.length : starIndex;
}

const patternRegExpCache = new Map<string, RegExp>();

function matchesTagPattern(tag: string, pattern: string): boolean {
  let regExp = patternRegExpCache.get(pattern);
  if (!regExp) {
    regExp = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
    patternRegExpCache.set(pattern, regExp);
  }
  return regExp.test(tag);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
