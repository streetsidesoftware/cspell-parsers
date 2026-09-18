// Renders a greeting.
/**
 * Builds the message shown on the home page.
 */
public class Greeting {
    private String name = "world"; // whom to greet

    public String message() {
        return """
                Hello, %s!
                Welcome "aboard".
                """.formatted(name);
    }
}
