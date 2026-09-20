/// <summary>
/// Formats greetings for the welcome screen.
/// </summary>
public class Greeter
{
    // The default name used when none is supplied.
    private const string DefaultName = "friend";

    /* Builds the greeting text shown to the visitor. */
    public string Greet(string? name)
    {
        var chosen = name ?? DefaultName;
        return $"Hello, {chosen}! Welcome abdoard.";
    }
}
