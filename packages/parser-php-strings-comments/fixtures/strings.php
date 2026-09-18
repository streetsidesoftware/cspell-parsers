<?php

// A single-quoted string never interpolates - $name stays literal.
$single = 'Hello, $name! No interpolation here.';

// A double-quoted string interpolates simple variables directly (not this parser's concern - it emits the
// whole string as one opaque blob either way) and allows escaped quotes.
$double = "She said \"hi\" then left.";

$url = "see http://example.com";
