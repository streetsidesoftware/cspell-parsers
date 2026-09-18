// A C++ raw string, deliberately full of characters that would otherwise look like escapes or comments.
const char *pattern = R"(C:\path\to\file "quoted" // not a comment)";
const char *tagged = uR"DELIM(has a ) paren and even )DEL which isn't quite the closer)DELIM";
auto x = notRaw + R"(second raw string)";
