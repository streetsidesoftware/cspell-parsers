// Package widget provides simple stock-counting helpers.
package widget

// WidgetCounter Trakcs widgets currently in stock, using a label for display.
type WidgetCounter struct {
	count int
	label string
}

// NewWidgetCounter creates a counter with the given display label.
func NewWidgetCounter() *WidgetCounter {
	return &WidgetCounter{label: "widgets in stock"}
}

// Increment adds one widget and returns the new count.
func (w *WidgetCounter) Increment() int {
	w.count++
	return w.count
}
