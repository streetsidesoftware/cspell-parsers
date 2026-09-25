// Keeps a running total of the orders placed today.
export class OrderTotals {
  private runningTotal = 0;

  addOrder(amount: number): number {
    this.runningTotal += amount;
    return this.runningTotal;
  }
}
