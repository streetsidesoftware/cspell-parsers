public class RawStrings
{
    // A plain (non-interpolated) raw string literal - three double quotes open and close it.
    public string Plain = """
        The word "quoted" appears without any escaping needed.
        """;

    // A raw string literal whose delimiter is a longer run of quotes, so a triple-quote sequence can
    // appear unescaped inside the body without ending the literal early.
    public string LongerDelimiter = """"
        This body may contain """ three double quotes """ safely.
        """";

    // An interpolated raw string literal - the "{count}" hole is kept as part of the emitted text rather
    // than being split out into its own scan, per this parser's documented raw-string simplification.
    public string Interpolated = $"""
        There are {count} raw widgets in stock.
        """;
}
