// Keeps a running total of the orders placed today.
public class OrderTotals {
    private double runningTotal = 0;

    public double addOrder(double amount) {
        runningTotal += amount;
        return runningTotal;
    }
}
