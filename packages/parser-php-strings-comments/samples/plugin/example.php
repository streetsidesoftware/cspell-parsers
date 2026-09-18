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
