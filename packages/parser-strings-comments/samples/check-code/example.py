# Keeps a running total of the orders placed today.
class OrderTotals:
    def __init__(self) -> None:
        self.running_total = 0.0

    def add_order(self, amount: float) -> float:
        self.running_total += amount
        return self.running_total
