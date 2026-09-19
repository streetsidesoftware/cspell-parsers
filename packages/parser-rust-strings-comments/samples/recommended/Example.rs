// The recommended settings select this parser for Rust source files automatically.
pub struct Shouter;

impl Shouter {
    /* Converts the message to upper case before returning it. */
    pub fn shout(&self, message: &str) -> String {
        message.to_uppercase()
    }

    /// Greets a visitor by name, falling back to a generic greeting.
    pub fn greet(&self, name: Option<&str>) -> String {
        let fallback = "friend";
        format!("Hello, {}!", name.unwrap_or(fallback))
    }
}
