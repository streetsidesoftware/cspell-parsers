/**
 * Counts widgets currently in stock.
 */
public class WidgetCounter {
    // Trakcs how many widgets have been added so far.
    private int count = 0;

    public int increment() {
        return ++count;
    }
}
