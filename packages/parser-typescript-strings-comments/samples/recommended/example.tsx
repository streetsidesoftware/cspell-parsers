// A tiny component showing the recommended settings also cover TSX.
export function Welcome({ name }: { name: string }) {
  const punctuation = '!';
  return <div>{`Welcome, ${name}${punctuation}`}</div>;
}
