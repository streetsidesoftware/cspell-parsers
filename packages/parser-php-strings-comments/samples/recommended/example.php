<!DOCTYPE html>
<html>
<body>
<h1>Recent orders</h1>
<?php
// The recommended settings select this parser for PHP files, covering html, comments, strings, and code.
function shout(string $message): string
{
    /* Converts the message to upper case before returning it. */
    return strtoupper($message);
}

/**
 * Greets a visitor by name, falling back to a generic greeting.
 */
function greet(?string $name): string
{
    $fallback = 'friend';
    return "Hello, {$name}!";
}

$summary = <<<SUMMARY
    Thanks for visiting the store today.
    We hope you found everything you needed.
    SUMMARY;

echo $summary;
?>
</body>
</html>
