//! Module-level inner doc comment.

/// Adds two numbers together.
pub fn add(a: i32, b: i32) -> i32 {
    // running total
    a + b
}

/* approximate */
pub fn approx() -> f64 {
    3.14
}

/**
 * Computes the square of a number.
 */
pub fn square(x: i32) -> i32 {
    x * x
}

/*!
 * Inner doc block comment describing this section.
 */
pub fn documented() {}

pub fn greeting() -> &'static str {
    "see http://example.com"
}

pub fn escaped() -> &'static str {
    "she said \"hi\" then left"
}

pub fn initial() -> char {
    'A'
}

pub fn magic_bytes() -> &'static [u8] {
    b"binary payload marker"
}
