public class Paths
{
    // Both prefix orderings are legal C# and must be recognized identically: doubled "" for a literal
    // quote, no backslash escapes, and {...} holes still split out for interpolation.
    public string DollarAt(string root, string name) => $@"Root is {root} and file is ""{name}""";

    public string AtDollar(string root, string name) => @$"Root is {root} and file is ""{name}""";
}
