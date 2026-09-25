<?php
/**
 * Counts the widgets that are currently in stock.
 */
class WidgetCounter
{
    // Trakcs how many widgets have been counted so far.
    private int $count = 0;

    public function increment(): int
    {
        return ++$this->count;
    }
}
