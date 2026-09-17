// Bare specifiers resolve through node_modules, so their spelling isn't ours to check.
import { debounce } from 'lodash-es';

/**
 * Formats a person's display name for a greeting banner.
 */
export class GreetingBanner {
  private readonly recipientName: string;

  constructor(recipientName: string) {
    this.recipientName = recipientName;
  }

  render(): string {
    return `Hello, ${this.recipientName}!`;
  }
}

// The imported binding is checked (its name was chosen here), but the `debounce` package's
// own internals - which we never spell - are not.
export const renderDebounced = debounce((banner: GreetingBanner) => banner.render(), 250);
