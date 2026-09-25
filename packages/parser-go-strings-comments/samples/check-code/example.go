// Package orders keeps a running total of the orders placed today.
package orders

// OrderTotals tracks the running total.
type OrderTotals struct {
	runningTotal float64
}

// AddOrder adds an order and returns the new total.
func (o *OrderTotals) AddOrder(amount float64) float64 {
	o.runningTotal += amount
	return o.runningTotal
}
