package main

// A raw string containing backslash sequences that would be escapes in an interpreted string - none of
// them are processed as escapes inside a backtick-delimited raw string literal.
var pattern = `C:\new\test\path and a lone backslash at the end \`
var after = "ok"
