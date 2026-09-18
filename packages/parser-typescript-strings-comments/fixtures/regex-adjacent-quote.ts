// A regex containing a contraction - the apostrophe is preceded by a letter, so it isn't mistaken for a
// string's opening quote.
const contraction = /don't|won't|can't/;

// A regex character class listing both quote kinds - the '"' follows a word-shorthand escape's letter, and
// the "'" follows that same quote, so neither is mistaken for a string's opening quote either.
const bothQuotes = /[\w"'].*/;

// Both regexes above must not have swallowed anything past them - this comment and string are still real.
const after = 'still recognized as a real string';
