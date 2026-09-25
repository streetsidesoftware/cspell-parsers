// Keeps a running total of the orders placed today.
pub struct OrderTotals {
    running_total: f64,
}

impl OrderTotals {
    pub fn add_order(&mut self, amount: f64) -> f64 {
        self.running_total += amount;
        self.running_total
    }
}
