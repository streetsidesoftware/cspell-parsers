// Package greeting builds friendly messages for the CLI.
package greeting

/* Combines a name with a fixed prefix before returning it. */
func Format(name string) string {
	prefix := "Hello, "
	pattern := `Raw strings never interpret escapes like \n.`
	_ = pattern
	return prefix + name
}
