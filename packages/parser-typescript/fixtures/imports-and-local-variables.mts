import { expl } from './example.js';

export function check(value: string): boolean {
  const expl = value;
  return expl.toUpperCase() === value;
}

export function checkExpl(): boolean {
  return check(expl);
}

export const arrFn = (expl: string) => {
  return expl.toUpperCase();
};
