// Deliberately exercises TypeScript syntax edge cases that the plain import/JSDoc fixtures don't
// reach - this file isn't meant to demonstrate best practices, just to keep the three parser
// backends honest about ranges and tags for trickier constructs. Everything here is intentionally
// spelled correctly; deliberate typos live under tests/with-issues instead.

// Numeric separators and a BigInt literal.
const population = 8_000_000_000;
const veryLargeCount = 9_007_199_254_740_993n;

// Optional chaining and nullish coalescing.
interface Address {
  city?: string;
}

function describeAddress(address: Address | undefined): string {
  return address?.city ?? 'unknown';
}

// Private class fields, a static initialization block, and an abstract member.
abstract class Counter {
  #count = 0;
  static #instances = 0;

  static {
    Counter.#instances = 0;
  }

  static get instances(): number {
    return Counter.#instances;
  }

  constructor() {
    Counter.#instances++;
  }

  abstract reset(): void;

  increment(): number {
    return ++this.#count;
  }
}

// Template literals: multi-line, an embedded expression, and a tagged template.
function tag(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((accumulated, part, index) => accumulated + part + (values[index] ?? ''), '');
}

const firstName = 'Alice';
const greetingLine = `Hello ${firstName},
this second line follows a newline inside a template literal.`;
const tagged = tag`Welcome, ${firstName}!`;

// A regex literal immediately after a token that could otherwise be mistaken for division.
const digitsOnly = /^[0-9]+$/;
const halved = 10 / 2 / digitsOnly.source.length;

// Destructuring with renaming and a default value.
const { city: hometown = 'nowhere' } = { city: undefined as string | undefined };

// The `satisfies` operator.
const palette = {
  primary: '#336699',
  secondary: '#663399',
} satisfies Record<string, string>;

// An async generator.
async function* countUpTo(limit: number): AsyncGenerator<number> {
  for (let value = 0; value < limit; value++) {
    yield value;
  }
}

// Emoji inside a comment and inside a string - neither should be treated as a word to check.
// A checked box for a passing test: ✅
const celebration = 'Great job! 🎉';

export {
  Counter,
  celebration,
  countUpTo,
  describeAddress,
  digitsOnly,
  greetingLine,
  halved,
  hometown,
  palette,
  population,
  tagged,
  veryLargeCount,
};
