/**
 * Counts widgets currently in stock.
 */
export class WidgetCounter {
  // Trakcs how many widgets have been added so far.
  private count = 0;

  increment(): number {
    return ++this.count;
  }
}
