import { Fragment, useState } from 'react';

interface ToggleListProps {
  items: string[];
}

/** Demonstrates JSX fragments, spread props, conditional rendering, and inline comments. */
export function ToggleList({ items, ...rest }: ToggleListProps & Record<string, unknown>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Fragment>
      {/* A comment inside a JSX expression container. */}
      <button type="button" onClick={() => setExpanded((previous) => !previous)}>
        {expanded ? 'Collapse' : 'Expand'}
      </button>
      {expanded && (
        <ul {...rest}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <>
        <span>A fragment shorthand nested inside another fragment.</span>
      </>
    </Fragment>
  );
}
