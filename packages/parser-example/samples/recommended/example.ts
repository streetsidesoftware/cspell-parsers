// The recommended settings select this parser for TypeScript files too,
// since it's just as reasonable a way to scan a language with C-style comments.
export function shout(message: string): string {
  /* Converts the message to upper case before returning it. */
  return message.toUpperCase();
}
