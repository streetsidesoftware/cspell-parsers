import type { ParsedTags, ParsedText, Parser } from '@cspell/cspell-types';

/**
 * A tag name, or a `*`-wildcard pattern matching one (see {@link TagFilterOptions}).
 */
export type TagPattern = string;

/**
 * Options for {@link customizeParser}: which tagged segments to keep.
 *
 * Deliberately declared here rather than imported from `@cspell/cspell-types`'s `ValidationTags` - the
 * two happen to share a shape today, but that's incidental. `customizeParser`'s options are a property of
 * its own filtering behavior and should be free to diverge from it.
 */
export interface TagFilterOptions {
  /**
   * The default filter setting for any tag not otherwise matched.
   * @default true
   */
  '*'?: boolean | undefined;

  /**
   * Filter setting for the specific tag or wildcard pattern.
   *
   * If not specified, the default (`'*'`) will be used.
   */
  [tag: TagPattern]: boolean | undefined;
}

/**
 * Decides whether a `ParsedText` should be kept (spell checked), given its `tags`. Returned by
 * {@link compileTagFilter}, which does all the pattern-matching setup once so this function itself
 * is cheap to call per segment.
 */
export type TagsFilter = (tags: ParsedTags | undefined) => boolean;

/**
 * Options for {@link customizeParser}, as a struct rather than a bare `TagFilterOptions` so it can grow
 * more options later without a breaking signature change.
 */
export interface CustomizeParserOptions {
  /**
   * Override the parser's `name`. Useful when registering more than one customized copy of the same
   * parser (e.g. under `plugins`), since cspell selects a parser by name and two parsers can't share one.
   */
  name?: string;
  /**
   * Which tagged segments to keep. Omit to keep everything.
   */
  tags?: TagFilterOptions;
}

/**
 * Wraps a single `Parser` so its `parse()` output only includes `parsedTexts` selected by
 * `options.tags`, and its `name` is `options.name` when given. `options.tags` is compiled into a
 * {@link TagsFilter} once here, before the parser ever runs - see {@link compileTagFilter}.
 */
export function customizeParser(parser: Parser, options: CustomizeParserOptions): Parser {
  return customizeParserWithFilter(parser, compileTagFilter(options.tags ?? {}), options.name);
}

function customizeParserWithFilter(parser: Parser, isIncluded: TagsFilter, name: string | undefined): Parser {
  return {
    name: name ?? parser.name,
    parse(content, filename) {
      const result = parser.parse(content, filename);
      return {
        ...result,
        parsedTexts: filterParsedTexts(result.parsedTexts, isIncluded),
      };
    },
  };
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
    const isTrailingWildcardOnly = starIndex === pattern.length - 1 && pattern.indexOf('*', starIndex + 1) === -1;
    if (isTrailingWildcardOnly) {
      prefixes.push({ prefix: pattern.slice(0, -1), specificity: starIndex, value });
      continue;
    }
    general.push({ regExp: patternToRegExp(pattern), specificity: starIndex, value });
  }
  // Longest (most specific) prefix first, so a match can stop scanning as soon as it finds one - every
  // remaining entry is guaranteed to be no more specific.
  prefixes.sort((a, b) => b.specificity - a.specificity);

  if (prefixes.length === 0 && general.length === 0) {
    return exact.size === 0 ? () => defaultValue : (tags) => matchExactOnly(tags, exact, defaultValue);
  }
  if (general.length === 0) {
    return (tags) => matchExactAndPrefixes(tags, exact, prefixes, defaultValue);
  }
  return (tags) => matchAnyPattern(tags, exact, prefixes, general, defaultValue);
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
