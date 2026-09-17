// Deliberate typo inside JSX text, right next to an embedded expression: Wecome (should be
// "Welcome"). This checks that all backends agree on where JSX text ranges start/end around `{name}`.
export function Banner({ name }: { name: string }) {
  return <div>Wecome, {name}!</div>;
}

// Deliberate typo inside a template literal's static text, right next to an embedded expression:
// occured (should be "occurred"). Same idea, but for template literals instead of JSX.
export function describeError(itemName: string): string {
  return `An error occured while loading ${itemName}.`;
}
