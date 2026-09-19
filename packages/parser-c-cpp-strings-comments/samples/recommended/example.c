// The recommended settings select this parser for both C and C++ files.
char *shout(char *message) {
    /* Converts the message to upper case in place before returning it. */
    for (char *p = message; *p; p++) {
        *p = toupper((unsigned char)*p);
    }
    return message;
}
