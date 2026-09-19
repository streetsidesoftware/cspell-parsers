pub struct Wrapper<'a> {
    value: &'a str,
}

pub fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

pub static GREETING: &'static str = "hello";

pub fn classify(c: char) -> bool {
    c == 'a' || c == '\n' || c == '\'' || c == '\x41' || c == '\u{1F600}'
}

pub fn byte_classify(b: u8) -> bool {
    b == b'x' || b == b'\n' || b == b'\x41'
}

pub fn underscore_lifetime(_value: &'_ str) {}
