import type { ParsedTags, ParsedText, Parser } from '@cspell/cspell-types';

import type { PluginParser, TagFilterOptions, TagsFilter } from './types.js';

export function customizeParserWithFilter(
  parser: PluginParser,
  isIncluded: TagsFilter,
  name: string | undefined,
): Parser {
  const newParser: Parser = {
    name: name ?? parser.name,
    parse(content, filename) {
      const result = parser.parse(content, filename);
      return {
        ...result,
        parsedTexts: filterParsedTexts(result.parsedTexts, isIncluded),
      };
    },
  };

  if (parser.parseDocument) {
    newParser.parseDocument = (doc) => {
      if (!parser.parseDocument) {
        throw new Error('parseDocument is not implemented on the original parser.');
      }
      const result = parser.parseDocument(doc);
      return { ...result, parsedTexts: filterParsedTexts(result.parsedTexts, isIncluded) };
    };
  }

  return newParser;
}

function* filterParsedTexts(parsedTexts: Iterable<ParsedText>, isIncluded: TagsFilter): Iterable<ParsedText> {
  for (const parsedText of parsedTexts) {
    if (isIncluded(parsedText.tags)) yield parsedText;
  }
}

interface Best {
  specificity: number;
  value: boolean | undefined;
}

interface Rule {
  readonly specificity: number;
  readonly value: boolean;
}

interface PrefixRule extends Rule {
  readonly prefix: string;
}

interface GeneralRule extends Rule {
  readonly regExp: RegExp;
}

/**
 * Compiles `options` ({@link TagFilterOptions}) into a {@link TagsFilter},
 * doing all the pattern classification, sorting, and regexp compilation up front - once per `options`
 * object - so that calling the returned function per `ParsedText` (potentially thousands of times per
 * file) is as cheap as possible.
 *
 * Every non-`'*'` key in `options` is a {@link TagPattern} and falls into one of three buckets:
 * - **exact** - no `*` at all (e.g. `comment.block.doc`). Matched with a plain `Map` lookup.
 * - **prefix** - exactly one `*`, and it's the last character (e.g. `comment.block.*`, `comment*`).
 *   Matched with `tag.startsWith(prefix)`, sorted longest-prefix-first once so matching can stop at the
 *   first hit instead of scanning every prefix.
 * - **general** - anything else (`*` in the middle, or more than one `*`, e.g. `*.doc`). Matched against
 *   a regexp, compiled once here rather than per call.
 *
 * The common cases - no wildcards at all, or only trailing wildcards - never touch the general/regexp
 * path or its per-call `RegExp#test`, which is the point of separating them out: a plugin author who
 * only writes patterns like `{ "*": false, "comment.block.doc": true }` or
 * `{ "*": false, "comment.block.*": true }` gets a hashmap-or-startsWith fast path, not a search through
 * regexps for every segment of every file.
 */
export function compileTagFilter(options: TagFilterOptions): TagsFilter {
  const defaultValue = options['*'] ?? true;
  const { exact, prefixes, general } = classifyTagPatterns(options);

  if (prefixes.length === 0 && general.length === 0) {
    return exact.size === 0 ? () => defaultValue : (tags) => matchExactOnly(tags, exact, defaultValue);
  }
  if (general.length === 0) {
    return (tags) => matchExactAndPrefixes(tags, exact, prefixes, defaultValue);
  }
  return (tags) => matchAnyPattern(tags, exact, prefixes, general, defaultValue);
}

interface ClassifiedPatterns {
  exact: Map<string, boolean>;
  prefixes: PrefixRule[];
  general: GeneralRule[];
}

/**
 * Classifies every non-`'*'` key in `options` into the exact/prefix/general buckets described in
 * {@link compileTagFilter}'s doc comment - shared between it (which matches a whole `ParsedTags` object
 * against these buckets) and {@link compileTagScoreCard} (which matches one tag name at a time).
 */
function classifyTagPatterns(options: TagFilterOptions): ClassifiedPatterns {
  const exact = new Map<string, boolean>();
  const prefixes: PrefixRule[] = [];
  const general: GeneralRule[] = [];

  for (const [pattern, value] of Object.entries(options)) {
    // An explicit `undefined` (vs. the key being absent) means "no opinion here" - same as unset.
    if (pattern === '*' || value === undefined) continue;
    const starIndex = pattern.indexOf('*');
    if (starIndex === -1) {
      exact.set(pattern, value);
      continue;
    }
    const isTrailingWildcardOnly = starIndex === pattern.length - 1;
    if (isTrailingWildcardOnly) {
      prefixes.push({ prefix: pattern.slice(0, -1), specificity: starIndex, value });
      continue;
    }
    general.push({ regExp: patternToRegExp(pattern), specificity: starIndex, value });
  }
  // Longest (most specific) prefix first, so a match can stop scanning as soon as it finds one - every
  // remaining entry is guaranteed to be no more specific.
  prefixes.sort((a, b) => b.specificity - a.specificity);

  return { exact, prefixes, general };
}

function matchExactOnly(
  tags: ParsedTags | undefined,
  exact: ReadonlyMap<string, boolean>,
  defaultValue: boolean,
): boolean {
  if (!tags) return defaultValue;
  let bestValue: boolean | undefined;
  let bestSpecificity = -1;
  for (const tag in tags) {
    if (!tags[tag]) continue;
    const value = exact.get(tag);
    if (value === undefined) continue;
    const specificity = tag.length;
    if (specificity > bestSpecificity) {
      bestValue = value;
      bestSpecificity = specificity;
    }
  }
  return bestValue ?? defaultValue;
}

function matchExactAndPrefixes(
  tags: ParsedTags | undefined,
  exact: ReadonlyMap<string, boolean>,
  prefixes: readonly PrefixRule[],
  defaultValue: boolean,
): boolean {
  if (!tags) return defaultValue;
  const best: Best = { specificity: -1, value: undefined };
  for (const tag in tags) {
    if (!tags[tag]) continue;
    matchExact(best, tag, exact);
    matchPrefixes(best, tag, prefixes);
  }
  return best?.value ?? defaultValue;
}

function matchAnyPattern(
  tags: ParsedTags | undefined,
  exact: ReadonlyMap<string, boolean>,
  prefixes: readonly PrefixRule[],
  general: readonly GeneralRule[],
  defaultValue: boolean,
): boolean {
  if (!tags) return defaultValue;
  const best: Best = { specificity: -1, value: undefined };
  for (const tag in tags) {
    if (!tags[tag]) continue;
    matchExact(best, tag, exact);
    matchPrefixes(best, tag, prefixes);
    for (const rule of general) {
      if (rule.specificity <= best.specificity) continue;
      if (rule.regExp.test(tag)) {
        best.specificity = rule.specificity;
        best.value = rule.value;
      }
    }
  }
  return best?.value ?? defaultValue;
}

function matchExact(best: Best, tag: string, exact: ReadonlyMap<string, boolean>): void {
  if (tag.length < best.specificity) return;
  const value = exact.get(tag);
  if (value === undefined) return;
  best.value = value;
  best.specificity = tag.length;
}

/** `prefixes` must already be sorted longest-first (see `compileTagFilter`). */
function matchPrefixes(best: Best, tag: string, prefixes: readonly PrefixRule[]): void {
  for (const rule of prefixes) {
    // Every later entry is <= this one's specificity (sorted desc), so once one can no longer beat the
    // current floor, none of the rest can either - stop scanning instead of just skipping this one.
    if (rule.specificity <= best.specificity) return;
    if (tag.startsWith(rule.prefix)) {
      best.value = rule.value;
      best.specificity = rule.specificity;
      return;
    }
  }
}

function patternToRegExp(pattern: string): RegExp {
  return new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Represents the score a tag gets.
 *
 * 0 = default value
 * > 0 = on (higher the stronger the match)
 * < 0 = off (lower the stronger the negative match)
 */
type TagScore = number;

interface TagScoreCard {
  [tag: string]: TagScore;
}

type KnownTagsAndDefaults = Record<string, boolean>;

/**
 * Resolves a single known tag name against already-classified `options` patterns - the same specificity
 * rules {@link matchAnyPattern} applies to a whole `ParsedTags` object (see {@link matchExact} and
 * {@link matchPrefixes}), but for one tag in isolation. This is the per-tag building block
 * {@link compileTagScoreCard} uses to precompute a score once per known tag, rather than re-running pattern
 * matching per `ParsedText`. Returns `undefined` when nothing in `options` addresses this tag at all.
 */
function matchSingleTag(
  tag: string,
  exact: ReadonlyMap<string, boolean>,
  prefixes: readonly PrefixRule[],
  general: readonly GeneralRule[],
): { value: boolean; specificity: number } | undefined {
  const best: Best = { specificity: -1, value: undefined };
  matchExact(best, tag, exact);
  matchPrefixes(best, tag, prefixes);
  for (const rule of general) {
    if (rule.specificity <= best.specificity) continue;
    if (rule.regExp.test(tag)) {
      best.specificity = rule.specificity;
      best.value = rule.value;
    }
  }
  return best.value === undefined ? undefined : { value: best.value, specificity: best.specificity };
}

// A known tag's score magnitude falls into one of three bands, weakest first, so a stronger band always
// outranks a weaker one regardless of how unspecific its own match was (e.g. a bare general pattern like
// "*.doc" has raw specificity 0, but as an explicit `options` match it must still outrank "*").
const TAG_DEFAULT_MAGNITUDE = 1; // nothing in `options` addresses this tag at all - its own built-in default
const WILDCARD_MAGNITUDE = 2; // `options['*']`, when nothing more specific matches
const EXPLICIT_MATCH_OFFSET = 3; // an exact/prefix/general `options` pattern; + its own specificity on top

function toScore(included: boolean, magnitude: number): TagScore {
  return included ? magnitude : -magnitude;
}

/**
 * Precomputes a {@link TagScoreCard}: one {@link TagScore} per tag in `knownTagsAndDefaults`, so filtering a
 * `ParsedText` later (via {@link compileTagFilterFromScoreCard}) is a handful of map lookups instead of
 * re-running `options`' exact/prefix/general pattern matching for every segment of every file.
 *
 * Each known tag is resolved independently and in isolation via {@link matchSingleTag}, using the same
 * specificity rules as {@link compileTagFilter} - `options`' most specific matching pattern wins - with two
 * fallbacks below that when nothing in `options` addresses the tag at all: `options['*']` if given,
 * otherwise the tag's own built-in default from `knownTagsAndDefaults` (e.g. a tag a parser emits but
 * doesn't spell check unless explicitly asked for - see `code` in `@cspell/parser-php-strings-comments`).
 * That fallback order - an explicit tag rule beats `'*'` beats the tag's own default - is why `'*'` being
 * merely *absent* from `options` (as opposed to explicitly set) must NOT implicitly mean `'*': true` the way
 * {@link compileTagFilter} treats it: doing so would make every known tag's own default unreachable, since
 * an implicit `'*': true` would always outrank it.
 *
 * A real `ParsedText`'s tags carry their whole ancestor chain (`comment.block.doc` also carries
 * `comment.block` and `comment`), so `compileTagFilterFromScoreCard` still has to pick whichever known tag
 * is both actually present on a given segment *and* has the strongest score - this function only has to get
 * each tag's own score right on its own.
 *
 * Every known tag always gets an explicit, nonzero-magnitude score (even one that resolves `false`) rather
 * than leaving it at the `TagScore` docs' "0 = default value" - that would only be correct if this score
 * card is always paired with a `compileTagFilterFromScoreCard(..., true)` call, and baking that coupling in
 * here would silently break any known tag whose own default is `false` if that pairing ever changed.
 */
function compileTagScoreCard(options: TagFilterOptions, knownTagsAndDefaults: KnownTagsAndDefaults): TagScoreCard {
  const { exact, prefixes, general } = classifyTagPatterns(options);
  const wildcard = options['*'];

  const scoreCard: TagScoreCard = {};
  for (const [tag, tagDefault] of Object.entries(knownTagsAndDefaults)) {
    const match = matchSingleTag(tag, exact, prefixes, general);
    if (match) {
      scoreCard[tag] = toScore(match.value, match.specificity + EXPLICIT_MATCH_OFFSET);
    } else if (wildcard !== undefined) {
      scoreCard[tag] = toScore(wildcard, WILDCARD_MAGNITUDE);
    } else {
      scoreCard[tag] = toScore(tagDefault, TAG_DEFAULT_MAGNITUDE);
    }
  }
  return scoreCard;
}

function compileTagFilterFromScoreCard(scoreCard: TagScoreCard, defaultValue: boolean): TagsFilter {
  const cachedResult: Map<ParsedTags, boolean> = new Map();
  // Most-specific (largest |score|) first
  const scores = new Map(Object.entries(scoreCard).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])));

  return (tags: ParsedTags | undefined) => {
    if (!tags) return defaultValue;
    const cached = cachedResult.get(tags);
    if (cached !== undefined) return cached;

    for (const [tag, score] of scores) {
      if (tag in tags && tags[tag]) {
        const resultForTag = score > 0 || (score === 0 && defaultValue);
        if (Object.isFrozen(tags)) {
          cachedResult.set(tags, resultForTag);
        }
        return resultForTag;
      }
    }
    if (Object.isFrozen(tags)) {
      cachedResult.set(tags, defaultValue);
    }
    return defaultValue;
  };
}

export function createParsedTextFilter(
  options: TagFilterOptions,
  knownTagsAndDefaults: KnownTagsAndDefaults,
): (text: ParsedText) => boolean {
  const scoreCard = compileTagScoreCard(options, knownTagsAndDefaults);
  // Same fallback compileTagFilter uses: for a `ParsedText` with no tags at all, or none of them known,
  // `options['*']` (not a hardcoded `true`) is what should decide it - otherwise `'*': false` could never
  // exclude an untagged/unknown-tagged segment, no matter what the caller asked for.
  const tagFilter = compileTagFilterFromScoreCard(scoreCard, options['*'] ?? true);
  return (text: ParsedText) => tagFilter(text.tags);
}
