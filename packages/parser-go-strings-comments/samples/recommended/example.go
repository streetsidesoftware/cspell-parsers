// Package shout provides simple text-transformation helpers.
package shout

import "strings"

// Shout converts the message to upper case before returning it.
func Shout(message string) string {
	return strings.ToUpper(message)
}

/*
Greet greets a visitor by name, falling back to a generic greeting.
*/
func Greet(name string) string {
	fallback := "friend"
	if name == "" {
		name = fallback
	}
	pattern := `a raw string with a literal backslash \ and no interpolation`
	_ = pattern
	return "Hello, " + name + "!"
}
