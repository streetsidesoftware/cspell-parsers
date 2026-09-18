<!DOCTYPE html>
<html>
<body>
<!-- A genuine typo, left in the markup on purpose - the "markup: false" filter in cspell.config.mts must
     keep this from being flagged, since the markup tag is excluded here. -->
<h1>Wecome to our sttore</h1>
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
