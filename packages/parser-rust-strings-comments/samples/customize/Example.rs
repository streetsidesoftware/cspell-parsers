/// Counts widgets currently in stock.
pub struct WidgetCounter {
    // Trakcs how many widgets have been added so far.
    count: u32,
}

impl WidgetCounter {
    pub fn increment(&mut self) -> u32 {
        self.count += 1;
        self.count
    }
}
