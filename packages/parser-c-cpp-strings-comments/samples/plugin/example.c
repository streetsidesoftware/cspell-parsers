// Builds a friendly greeting for the given visitor.
const char *greeting(const char *visitor) {
    static char buffer[128];
    snprintf(buffer, sizeof(buffer), "Hello, %s! Welcome back.", visitor);
    return buffer;
}

/**
 * Renders the page footer.
 */
const char *footer(void) {
    return "Thanks for stopping by.";
}
