name = "world"
count = 3
total = 10
value = 42


def compute(a, b):
    return a + b


greeting = f"Hello, {name}!"
report = f"{count} of {total} done"
literal_braces = f"{{not a hole}} but {value} is"
nested_call = f"Value: {compute(count, total)}"

with_comment_in_hole = f"{
    value  # the value
}"

with_string_in_hole = f"{'nested' + name}"

triple = f"""
Multi-line: {value}
Braces: {{literal}}
"""
