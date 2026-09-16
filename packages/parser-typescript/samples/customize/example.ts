// This config only validates the "comment" tag (see cspell.config.mts: customizePlugin({ '*': false,
// comment: true })), so identifiers and string content below are never spell checked - only comments are.

/*
 Has delibbberate typos in this comment.
 */

/**
 * The function name below has a deliberate typo that would normally be flagged, but isn't here, since
 * identifiers aren't validated by this config.
 */
export function formatGreetign(name: string): string {
  return `Hello, ${name}!`;
}
