// Package greeting builds friendly messages for the CLI.
package greeting

/* approximate */
const pi = 3.14

/**
 * Adds two numbers together.
 */
func Add(a, b int) int {
	return a + b
}

/* Combines a name with a fixed prefix. */
func Format(name string) string {
	prefix := "see http://example.com" // not a real comment: "/* nope */"
	newline := '\n'
	_ = newline
	initial := 'A'
	_ = initial
	quoteInside := "she said \"hi\" then left"
	_ = quoteInside
	pattern := `C:\path\to\file "quoted" // not a comment`
	_ = pattern
	return prefix + name
}
