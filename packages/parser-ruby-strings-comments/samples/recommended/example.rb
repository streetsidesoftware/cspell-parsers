# The recommended settings select this parser for Ruby files.
def shout(message)
  # Converts the message to upper case before returning it.
  message.upcase
end

# Greets a visitor by name, falling back to a generic greeting.
def greet(name = nil)
  fallback = 'friend'
  "Hello, #{name || fallback}!"
end

report = <<~REPORT
  Summary for today:
  Everything looks good.
REPORT

puts report
