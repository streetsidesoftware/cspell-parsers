/**
 * Counts widgets currently in stock.
 */
class WidgetCounter {
public:
    int increment() { return ++count; }

private:
    // Trakcs how many widgets have been added so far.
    int count = 0;
};
