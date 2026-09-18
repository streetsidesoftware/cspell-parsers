// Builds a friendly greeting for the given visitor.
public class Example {
    public static String greeting(String visitor) {
        String template = "Hello, " + visitor + "! Welcome back.";
        return template;
    }

    /**
     * Renders the page footer.
     */
    public static String footer() {
        return "Thanks for stopping by.";
    }
}
