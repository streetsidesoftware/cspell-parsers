plain_raw = r"C:\Users\test"
raw_single_quote = r'no escapes here \n stays literal'
raw_with_escaped_quote = r"a\"b"

byte_string = b"raw bytes example"
raw_bytes_rb = rb"\x00\x01"
raw_bytes_br = br"\x02\x03"

raw_f_string_rf = rf"path: {plain_raw}"
raw_f_string_fr = fr"path: {plain_raw}"

not_a_prefix = "hover"  # ends in 'r' but isn't a prefix of anything, just an ordinary string

boundary_check = numbr"not a prefix - numbr ends in br, but br is mid-identifier here"
