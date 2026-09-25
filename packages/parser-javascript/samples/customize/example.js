// This config only spell checks line comments and doc comments (see cspell.config.mts).
// Identifiers, strings, and plain block comments below aren't spell checked.

/*
 Has delibbberate typos in this comment.
 */

/**
 * The function name below has a deliberate typo that would normally be flagged, but isn't here, since
 * identifiers aren't spell checked by this config.
 */
export function formatGreetign(name) {
  return `Hello, ${name}!`;
}
