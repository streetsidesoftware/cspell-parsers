<?php

# A real shell-style comment.
#[Attribute]
class Logger
{
    #[Deprecated(reason: 'use the new logger instead')]
    public function log(string $message): void
    {
        echo $message;
    }
}

#[Attribute(Attribute::TARGET_METHOD)]
function trace(): void
{
}
