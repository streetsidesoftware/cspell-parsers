<!DOCTYPE html>
<html>
<body>
<!-- Checked, since cspell.config.mts opts into the html tag. -->
<h1>Welcome to our store</h1>
<?php
/**
 * Counts widgets currently in stock.
 */
class WidgetCounter
{
    private int $count = 0;

    public function increment(): int
    {
        return ++$this->count;
    }
}
?>
</body>
</html>
