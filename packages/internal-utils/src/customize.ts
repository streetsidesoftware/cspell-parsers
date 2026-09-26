import type { ParsedTags, ParsedText } from '@cspell/cspell-types';

import type { TagFilterOptions, TagsFilter } from './types.ts';

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

interface ClassifiedPatterns {
  exact: Map<string, boolean>;
  prefixes: PrefixRule[];
  general: GeneralRule[];
}

/** Splits `options`' keys into exact, prefix (`comment.*`, longest first) and general (`*.doc`) patterns. */
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
  // Longest-prefix-first, so matching can stop at the first hit.
  prefixes.sort((a, b) => b.specificity - a.specificity);

  return { exact, prefixes, general };
}

function matchExact(best: Best, tag: string, exact: ReadonlyMap<string, boolean>): void {
  if (tag.length < best.specificity) return;
  const value = exact.get(tag);
  if (value === undefined) return;
  best.value = value;
  best.specificity = tag.length;
}

/** `prefixes` must already be sorted longest-first (see `classifyTagPatterns`). */
function matchPrefixes(best: Best, tag: string, prefixes: readonly PrefixRule[]): void {
  for (const rule of prefixes) {
    // Sorted desc by specificity: once one rule can't beat the floor, none after it can either.
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

/** Positive = on, negative = off; magnitude = strength of the match. */
type TagScore = number;

interface TagScoreCard {
  [tag: string]: TagScore;
}

type KnownTagsAndDefaults = Record<string, boolean>;

/**
 * Resolves one tag name against classified `options`: the most specific matching pattern wins.
 * Returns `undefined` if `options` doesn't address this tag at all.
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

// Magnitude bands, weakest to strongest, so a stronger band always outranks a weaker one regardless of
// how unspecific its own match was (e.g. a bare general pattern like "*.doc" has raw specificity 0, but
// as an explicit `options` match it must still outrank "*").
const TAG_DEFAULT_MAGNITUDE = 1; // no `options` pattern addresses this tag - its own built-in default
const WILDCARD_MAGNITUDE = 2; // `options['*']`, when nothing more specific matches
const EXPLICIT_MATCH_OFFSET = 3; // an exact/prefix/general `options` pattern; + its own specificity on top

function toScore(included: boolean, magnitude: number): TagScore {
  return included ? magnitude : -magnitude;
}

/**
 * Precomputes a {@link TagScoreCard}: one score per tag in `knownTagsAndDefaults`, so filtering a
 * `ParsedText` (via {@link compileTagFilterFromScoreCard}) is map lookups instead of re-running pattern
 * matching per segment.
 *
 * Per tag, resolution order is: an explicit `options` pattern, then `options['*']`, then the tag's own
 * default (e.g. `code` in `@cspell/parser-php-strings-comments`, which defaults off). `'*'` being merely
 * *absent* from `options` must NOT implicitly mean `true` - that would make every tag's own default
 * unreachable.
 *
 * A real `ParsedText`'s tags carry the whole ancestor chain, so `compileTagFilterFromScoreCard` still
 * picks whichever known tag is present on a segment *and* has the strongest score.
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
        const resultForTag = score > 0;
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
  // `options['*']` decides untagged/unknown-tagged segments.
  const tagFilter = compileTagFilterFromScoreCard(scoreCard, options['*'] ?? true);
  return (text: ParsedText) => tagFilter(text.tags);
}
