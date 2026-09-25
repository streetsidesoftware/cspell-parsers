public class Notifier
{
    // Builds a message describing how many unread notifications a visitor has.
    public string Describe(string visitor, int count)
    {
        // The hole below embeds a ternary whose two branches are plain string literals, plus a line
        // comment placed right inside the hole - both must still be recognized and tagged normally.
        var summary = $"Hello, {visitor}! You have {(count == 1 ? "one message" : "several messages")} waiting.";
        var withComment = $"Count is {
            // explains the fallback value used when count is negative
            (count < 0 ? 0 : count)
        } after clamping.";
        var braces = $"Use {{braces}} around {visitor}.";
        return summary + withComment;
    }
}
