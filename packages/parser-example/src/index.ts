export type ExampleParser = {
  parse(text: string): string[];
};

export function createExampleParser(): ExampleParser {
  return {
    parse(text: string): string[] {
      return text
        .trim()
        .split(/\s+/g)
        .filter(Boolean);
    },
  };
}
