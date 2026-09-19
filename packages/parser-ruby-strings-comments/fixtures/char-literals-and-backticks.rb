# ?'/?"/?# are one-character-string literals whose second character would otherwise be misread as the
# start of a real string or comment - see CONTRIBUTING.md. A plain ?a needs no special handling at all.
quote_char = ?'
double_quote_char = ?"
hash_char = ?#
plain_char = ?a

# A ternary right after a value must still work normally, with or without a space after "?".
labelled = quote_char ? 'yes' : 'no'
unspaced = quote_char ?'yes':'no'

# Backtick command strings are recognized like double-quoted strings, including interpolation, and must not
# let an embedded quote or "#" run away into the rest of the file.
listing = `ls -la 'My Documents'`
greeting = `echo #{labelled} today`

real_string_after_all_of_the_above = 'still a real string, unaffected by anything above'
