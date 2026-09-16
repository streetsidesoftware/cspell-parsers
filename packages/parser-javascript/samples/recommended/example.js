// Bare specifiers resolve through node_modules, so their spelling isn't ours to check.
import { debounce } from 'lodash-es';

/** Formats a greeting message for the given recipient. */
export function formatGreeting(recipientName) {
  return `Hello, ${recipientName}!`;
}

export const formatGreetingDebounced = debounce(formatGreeting, 250);
