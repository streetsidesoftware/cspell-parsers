# A character class containing a quote is recognized as a regex, never misread as a string.
quote_class = /['"]/

# An escaped slash inside a pattern doesn't end the regex early.
escaped_slash = /a\/b/

# Flags after the closing delimiter are consumed as part of the regex.
with_flags = /pattern/i

# A regex is recognized right after a keyword that starts a new expression.
def after_if(x)
  if /foo/ =~ x
    puts 'matched'
  end
end

# Ordinary division must never be mistaken for a regex.
division_after_identifier = a / b
division_after_number = 5 / 2
division_after_call = foo() / 2
division_after_paren = (a + b) / c
division_after_bracket = arr[0] / 2

# "}" is treated as division/append-like, so a real string right after it is still recognized normally.
computed = { a: 1 } / 2
real_string_after_brace = 'still a real string'
trailing_regex = /pattern/
