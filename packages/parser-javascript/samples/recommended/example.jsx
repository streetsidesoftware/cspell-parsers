import { useState } from 'react';

/** A small counter widget, used to demonstrate JSX text and prop handling. */
export function Counter({ startingValue }) {
  const [count, setCount] = useState(startingValue);

  return (
    <div>
      <p>Current count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
