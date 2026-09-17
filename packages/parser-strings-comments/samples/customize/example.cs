/// <summary>
/// Counts widgets currently in stock.
/// </summary>
public class WidgetCounter
{
    // Trakcs how many widgets have been added so far.
    private int count = 0;

    public int Increment()
    {
        return ++count;
    }
}
