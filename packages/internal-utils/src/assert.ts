/**
 * Our own assertion function to avoid runtime depdency upon external libraries.
 * @param condition - the condition to assert
 * @param message - the error message to throw if the assertion fails
 */
export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
