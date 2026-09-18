// The recommended settings select this parser for TypeScript files too,
// since it shares comment and string syntax with the rest of the C-style family.
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
