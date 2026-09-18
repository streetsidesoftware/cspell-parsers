// The recommended settings select this parser for Java files.
public class Example {
    /* Converts the message to upper case before returning it. */
    public static String shout(String message) {
        return message.toUpperCase();
    }

    /**
     * Greets a visitor by name, falling back to a generic greeting.
     */
    public static String greet(String name) {
        String fallback = "friend";
        String who = (name != null) ? name : fallback;
        return """
                Hello, %s!
                """.formatted(who);
    }
}
