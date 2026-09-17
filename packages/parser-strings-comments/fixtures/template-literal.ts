// Greets a user by name.
/**
 * Builds a greeting string for the header.
 */
export function greet(name: string, count: number): string {
  const label = 'friend';
  const title = "the visitor";
  return `Hello, ${name || label}! You have ${count} new ${count === 1 ? 'message' : 'messages'}, ${title}.`;
}
