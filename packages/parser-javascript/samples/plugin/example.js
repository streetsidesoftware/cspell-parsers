// Bare specifiers resolve through node_modules, so their spelling isn't ours to check.
import { debounce } from 'lodash-es';

/**
 * Formats a person's display name for a greeting banner.
 */
export class GreetingBanner {
  constructor(recipientName) {
    this.recipientName = recipientName;
  }

  render() {
    return `Hello, ${this.recipientName}!`;
  }
}

// The imported binding is checked (its name was chosen here), but the `debounce` package's
// own internals - which we never spell - are not.
export const renderDebounced = debounce((banner) => banner.render(), 250);
