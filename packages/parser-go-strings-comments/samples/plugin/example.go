// Package greeting builds a friendly greeting for the given visitor.
package greeting

import "fmt"

// Greeting returns a friendly greeting for the given visitor.
func Greeting(visitor string) string {
	template := fmt.Sprintf("Hello, %s! Welcome back.", visitor)
	return template
}

/*
Footer renders the page footer.
*/
func Footer() string {
	return "Thanks for stopping by."
}
