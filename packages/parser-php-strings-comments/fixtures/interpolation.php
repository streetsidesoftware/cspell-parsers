<?php

$arr = ['key' => 'value'];

// A {$...} hole whose nested quote (') never matches the outer string's own delimiter (").
$single = "Value: {$arr['key']}!";

// A {$...} hole whose nested quote (") DOES match the outer string's own delimiter.
$double = "Value: {$arr["key"]}!";

// The real risk case: a nested single-quoted key containing a literal "}" immediately followed by a
// literal '"'. Brace-depth tracking alone (without skipSimpleQuoted skipping the nested quoted run as a
// unit) would treat the "}" inside the key as closing the interpolation hole right there, leaving the "'"
// that follows unconsumed - and the very next character after that stray "}" is a '"', which the outer
// scanQuotedString loop would then mistake for its own closing quote, truncating the string early.
$risky = "X: {$arr['a}"']}!";
