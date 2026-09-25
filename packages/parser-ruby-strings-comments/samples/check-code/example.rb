# Keeps a running total of the orders placed today.
class OrderTotals
  def initialize
    @running_total = 0
  end

  def add_order(amount)
    @running_total += amount
  end
end
