// The module's own export name is never authored here, so it isn't checked...
import { debounce } from 'lodash-es';

// ...but a local decleration can reuse that same name and shadow it. Inside this
// function, `debounce` refers to the parameter below, not the import above, so
// it (and any property accessed off it) is checked normally.
export function wrapWithLogging(debounce: (message: string) => void): (message: string) => void {
  return (message: string) => {
    debounce(message);
  };
}

export class RequestThrottler {
  private readonly delayMilliseconds: number;

  constructor(delayMilliseconds: number) {
    this.delayMilliseconds = delayMilliseconds;
  }

  /** Wraps a callback so it only fires after requests settle down. */
  throttle(callback: () => void): () => void {
    return debounce(callback, this.delayMilliseconds);
  }
}
