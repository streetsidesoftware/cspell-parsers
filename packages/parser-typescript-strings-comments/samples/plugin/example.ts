// Builds a friendly greeting for the given visitor.
export function greeting(visitor: string): string {
  const template = `Hello, ${visitor}! Welcome back.`;
  return template;
}

/**
 * Renders the page footer.
 */
export function footer(): string {
  return 'Thanks for stopping by.';
}
