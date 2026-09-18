<?php

$name = 'World';

$heredoc = <<<GREETING
    Hello, {$name}!
    Interpolation is active in here.
    GREETINGS are not the closing marker, even at the start of a line.
    GREETING;

$nowdoc = <<<'LITERAL'
    Hello, {$name}!
    No interpolation happens in a nowdoc.
    LITERAL;
