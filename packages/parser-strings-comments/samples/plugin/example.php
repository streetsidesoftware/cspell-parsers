<?php

// Builds a friendly greeting for the given visitor.
function greeting(string $visitor): string {
    $template = "Hello, {$visitor}! Welcome back.";
    return $template;
}

/**
 * Renders the page footer.
 */
function footer(): string {
    $note = <<<EOT
        Thanks for stopping by.
        Please come again soon.
        EOT;
    return $note;
}
