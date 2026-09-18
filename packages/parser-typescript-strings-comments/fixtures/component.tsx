// A tiny component fixture, mostly to exercise the .tsx extension mapping.
export function Welcome({ name }: { name: string }) {
  const punctuation = '!';
  return <div>{`Welcome, ${name}${punctuation}`}</div>;
}
