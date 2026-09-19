squiggly = <<~SQL
  SELECT *
  FROM users
  WHERE name = 'Alice'
SQL

dashed = <<-EOS
  Some dashed heredoc text.
  # This looks like a comment but must not be scanned as code.
  puts "should not be treated as a real string either"
EOS

plain = <<PLAIN
Plain heredoc marker with no leading whitespace before the terminator.
PLAIN

plain_with_indented_lookalike = <<PLAIN2
Body text before the indented lookalike line.
  PLAIN2
Body text after it - an indented occurrence of the marker is not the terminator for a plain heredoc.
PLAIN2

literal = <<~'RAW'
  No #{interpolation} happens in here - this is literal text, braces and all.
RAW

quoted_interp = <<~"QUOTED"
  Quoted double-quoted marker still interpolates: #{1 + 1}.
QUOTED
