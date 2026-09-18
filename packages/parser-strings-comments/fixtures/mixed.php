<!DOCTYPE html>
<html>
<body>
<h1>Welcome</h1>
<?php
// running total
$total = 0; // trailing note

# shell-style comment
/**
 * Builds the page footer.
 */
function footer() {
    return 'thanks for visiting';
}

$arr = ['key' => 'value'];
$name = "world";
$greeting = "Hello, {$arr['key']}! Welcome, $name.";
$greeting2 = "Nested: {$arr["key"]}! Done.";

$heredoc = <<<EOT
    Hello, {$name}!
    This line mentions EOTHING but not the closing marker.
    EOT;

$nowdoc = <<<'RAW'
    No $interpolation happens in here.
    RAW;

echo $greeting;
?>
<p>Thanks for stopping by.</p>
</body>
</html>
