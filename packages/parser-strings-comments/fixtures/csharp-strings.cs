/// <summary>
/// Formats a greeting for display.
/// </summary>
public class Greeting
{
    // the person being greeted
    private string name = "world";

    /* Combines the parts into one line. */
    public string Format()
    {
        var path = @"C:\Users\name\file.txt";
        var quoted = @"she said ""hello"" softly";
        var message = $"Hello, {name}! Today is {DateTime.Now:yyyy-MM-dd}.";
        var both = $@"Path is {path} and it has a "" quote";
        var raw = """
            A raw string literal
            with an embedded "quoted" word.
            """;
        return message;
    }
}
