def banner(user)
  <<~BANNER
    Wlecome, #{user}! Thanks for stopping by.
  BANNER
end

# Counts widgets currently in stock.
class WidgetCounter
  # Tracks how many widgets have been added so far.
  def initialize
    @count = 0
  end

  def increment
    @count += 1
  end
end
