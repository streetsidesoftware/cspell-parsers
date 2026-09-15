#include <stdio.h>

// Prints a friendly greeting to standard output.
int main(void) {
  const char *greeting = "hello, world";
  printf("%s\n", greeting);
  return 0;
}

/*
 * The block comment above the function is checked for spelling, but the
 * string literal and code around it are left alone by this parser.
 */
