// A regex containing a contraction is recognized and skipped as one unit - the apostrophe never reaches
// the string dispatch at all.
const contraction = /don't|won't|can't/;

// A character class that opens with a quote right after "[" - unfixable by any per-character heuristic,
// since "[" also legitimately precedes a real string (an array literal) - is fully recognized too, because
// the whole regex is matched and skipped as one shape, not decided quote by quote.
const quoteClass = /['"]/;

// A character class containing a literal "/" doesn't end the regex early.
const slashClass = /[/]/;

// An escaped "/" inside the body doesn't end the regex early either.
const escapedSlash = /a\/b/;

// Flags after the closing delimiter are consumed as part of the regex, not left dangling as ordinary code.
const withFlags = /pattern/gi;

// A regex is still recognized right after a keyword that can precede an expression directly, with no
// operator in between - "return" ends in an identifier character just like a real value would, but it
// isn't one.
function afterReturn() {
  return /it's a regex/;
}

// Ordinary division must never be mistaken for a regex: after an identifier, a number, a call, a closing
// paren, or a closing bracket, "/" always means division.
const divisionAfterIdentifier = a / b;
const divisionAfterNumber = 5 / 2;
const divisionAfterCall = foo() / 2;
const divisionAfterParen = (a + b) / c;
const divisionAfterBracket = arr[0] / 2;

// An identifier that merely ends in a keyword's letters ("myreturn" contains "return") must not be
// mistaken for that keyword - this is still division.
const divisionAfterKeywordLikeIdentifier = myreturn / 2;

// "}" is ambiguous - it closes both a block statement (after which a real regex commonly follows) and an
// object literal (after which "/" is division) - so a "/" right after one is deliberately treated as
// division. This real string must still be recognized normally, never silently swallowed by that division
// being wrongly mistaken for a regex reaching all the way to the unrelated "/" that opens the next line's
// regex.
const dividedObjectLiteral = { a: 1 } / 2;
const realStringAfterAmbiguousBrace = 'still a real string';
const trailingRegex = /pattern/;

// A RegExp(...) call built from strings at runtime is exactly as unfit for spell checking as a regex
// literal's own body - both its pattern and (if given) its flags argument are skipped, not just the first.
const fromConstructor = new RegExp("don't|won't", "gi");

// A comment inside a RegExp(...) call's argument list is still recognized normally - only string literals
// are skipped, since only they can be pattern/flags content.
const multilinePattern = RegExp(
  "another pattern", // not spell checked, but this comment still is
);

// A longer identifier that merely contains "RegExp" isn't mistaken for the global constructor.
const notActuallyRegExp = MyRegExpUtils('this string is checked normally');
