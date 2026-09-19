/* outer /* inner */ still open */
pub fn nested() {}

/* level1 /* level2 /* level3 */ back to level2 */ back to level1 */
pub fn triple_nested() {}

/**
 * outer doc /* nested plain comment */ still doc
 */
pub fn nested_doc() {}
