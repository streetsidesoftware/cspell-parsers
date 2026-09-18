// The recommended settings select this parser for C# source files automatically.
public class Shouter
{
    public string Shout(string message)
    {
        /* Converts the message to upper case before returning it. */
        return message.ToUpperInvariant();
    }

    /// <summary>
    /// Greets a visitor by name, falling back to a generic greeting.
    /// </summary>
    public string Greet(string name)
    {
        var fallback = "friend";
        return $"Hello, {(string.IsNullOrEmpty(name) ? fallback : name)}!";
    }
}
