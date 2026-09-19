# The recommended settings select this parser for Python files automatically.
def shout(message: str) -> str:
    """Converts the message to upper case before returning it."""
    return message.upper()


def greet(name: str = "") -> str:
    fallback = "friend"
    return f"Hello, {name or fallback}!"
