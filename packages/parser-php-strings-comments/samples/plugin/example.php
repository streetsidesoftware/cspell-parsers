<!-- A genuine typo, left in the markup on purpose - html is off by default, so it must not be flagged. -->
<h1>Wecome to our sttore</h1>
<?php

// Builds a friendly greeting for the given visitor.
function greeting(string $visitor): string
{
    return "Hello, {$visitor}! Welcome back.";
}

/**
 * Renders the page footer.
 */
function footer(): string
{
    return 'Thanks for stopping by.';
}
