// Builds a friendly greeting for the given visitor.
pub struct Greeter;

impl Greeter {
    pub fn greeting(&self, visitor: &str) -> String {
        format!("Hello, {visitor}! Welcome back.")
    }

    /// Renders the page footer.
    pub fn footer(&self) -> &'static str {
        "Thanks for stopping by."
    }
}
