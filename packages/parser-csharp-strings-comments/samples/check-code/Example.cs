// Keeps a running total of the orders placed today.
public class OrderTotals
{
    private decimal runningTotal = 0;

    public decimal AddOrder(decimal amount)
    {
        runningTotal += amount;
        return runningTotal;
    }
}
