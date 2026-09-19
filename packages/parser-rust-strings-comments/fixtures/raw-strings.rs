pub fn plain() -> &'static str {
    r"plain raw string with a backslash \ and no escapes"
}

pub fn hashed() -> &'static str {
    r#"raw string with an embedded "quote" that needs one hash"#
}

pub fn double_hashed() -> &'static str {
    r##"raw string with an embedded "# that must not close it early"##
}

pub fn byte_raw() -> &'static [u8] {
    br"byte raw string, no escapes \ here either"
}

pub fn c_raw() -> &'static std::ffi::CStr {
    cr#"C raw string with an embedded "quote" and no escapes \ either"#
}
