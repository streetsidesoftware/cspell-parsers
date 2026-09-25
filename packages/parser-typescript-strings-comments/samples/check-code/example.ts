// Counts the widgets that are currently in stock.
export function countWidgetsInStock(widgets: { inStock: boolean }[]): number {
  return widgets.filter((widget) => widget.inStock).length;
}
