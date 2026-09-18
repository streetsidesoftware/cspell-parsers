// Builds a friendly greeting for the given visitor.
public class Greeter
{
    public string Greeting(string visitor)
    {
        var template = $"Hello, {visitor}! Welcome back.";
        return template;
    }

    /// <summary>
    /// Renders the page footer.
    /// </summary>
    public string Footer()
    {
        return "Thanks for stopping by.";
    }
}
