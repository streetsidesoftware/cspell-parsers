// Package greeting builds friendly messages for the CLI.
package greeting

/* Combines a name with a fixed prefix. */
func Format(name string) string {
	prefix := "Hello, "
	newline := '\n'
	_ = newline
	pattern := `C:\path\to\file "quoted" // not a comment`
	_ = pattern
	return prefix + name
}
