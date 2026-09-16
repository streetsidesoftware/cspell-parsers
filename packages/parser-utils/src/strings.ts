import type { SourceMap } from '@cspell/cspell-types';

/** One piece of a string/template literal's content, in source order (no surrounding quotes/backticks). */
export interface StringPart {
  /** The exact source text of this piece - a `string_fragment`'s literal text, or one `escape_sequence`. */
  readonly text: string;
  /** True if `text` is a single escape sequence (e.g. `\n`, `é`, `\x41`) that should be decoded. */
  readonly isEscape: boolean;
}

export interface DecodedText {
  /** `parts` concatenated, with every escape part replaced by the character(s) it decodes to. */
  readonly text: string;
  /** Maps an offset in `text` back to an offset in the concatenated `parts` - see {@link SourceMap}. */
  readonly map: SourceMap;
}

/**
 * Decodes a sequence of string/template-literal parts - as split out by a grammar that already
 * distinguishes literal text from escape sequences (e.g. tree-sitter's `string_fragment` and
 * `escape_sequence` node types) - into the text a spell checker should actually see, plus a `map` back
 * to the original (still-escaped) source. `é` and `\x41` become `é` and `A`; `\n`/`\t`/etc. become
 * their real control character; a line-continuation escape (backslash followed by an actual newline)
 * disappears entirely (zero-length replacement). This does not handle the surrounding quotes/backticks
 * or the delimiters of a template substitution (`${`/`}`) - a caller splits those out separately, the
 * same way `parts` was already split from them.
 */
export function decodeStringParts(parts: readonly StringPart[]): DecodedText {
  const map: SourceMap = [];
  let text = '';
  for (const part of parts) {
    const decoded = part.isEscape ? decodeEscapeSequence(part.text) : part.text;
    map.push(part.text.length, decoded.length);
    text += decoded;
  }
  return { text, map };
}

/** Decodes one escape sequence's raw text (always starting with `\`) to the character(s) it represents. */
function decodeEscapeSequence(raw: string): string {
  const c = raw[1];
  switch (c) {
    case 'n':
      return '\n';
    case 't':
      return '\t';
    case 'r':
      return '\r';
    case 'b':
      return '\b';
    case 'f':
      return '\f';
    case 'v':
      return '\v';
    case '0':
      // Bare "\0" is NUL; anything longer (e.g. "\012") is a legacy octal escape - not decoded to its
      // numeric value (rare/deprecated, and never spell-checkable content either way), just left as digits.
      return raw.length === 2 ? '\0' : raw.slice(1);
    case '\\':
    case "'":
    case '"':
    case '`':
    case '$':
      return c;
    case 'x': {
      const hex = raw.slice(2);
      return /^[0-9a-fA-F]{2}$/.test(hex) ? String.fromCharCode(parseInt(hex, 16)) : raw.slice(1);
    }
    case 'u': {
      const hex = raw[2] === '{' ? raw.slice(3, -1) : raw.slice(2);
      return /^[0-9a-fA-F]+$/.test(hex) ? String.fromCodePoint(parseInt(hex, 16)) : raw.slice(1);
    }
    case '\n':
    case '\r':
    case ' ':
    case ' ':
      return ''; // line continuation - splices the escaped line break out of the string entirely
    default:
      // Everything else (an unrecognized letter, or a legacy octal digit like "\1"): the JS/TS spec just
      // drops the backslash and keeps the character(s) after it as-is.
      return raw.slice(1);
  }
}
