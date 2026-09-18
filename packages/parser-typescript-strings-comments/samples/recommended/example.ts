// The recommended settings select this parser for JavaScript, JSX, and TSX too,
// since they all share the same comment/string/template-literal syntax.
export function shout(message: string): string {
  /* Converts the message to upper case before returning it. */
  return message.toUpperCase();
}

/**
 * Greets a visitor by name, falling back to a generic greeting.
 */
export function greet(name?: string): string {
  const fallback = 'friend';
  return `Hello, ${name || fallback}!`;
}
