# Percent-literals are recognized and skipped as opaque units, exactly like a regex literal - none of their
# content below should ever be spell checked.
words = %w[don't stop believing]
symbols = %i[can't won't]
quoted = %q(it's fine, "quoted" too)
double = %Q{interpolated #{1 + 1} text}
regex = %r{a\.b}i
nested = %w(foo (bar) baz)

real_after_percent_literals = 'still a real string after every percent-literal above'
