import unicodedata


def canonicalize_identity(value: str) -> str:
    """Return the trimmed NFKC form kept for display and responses."""
    return unicodedata.normalize("NFKC", value).strip()


def normalize_identity(value: str) -> str:
    """Return the canonical comparison key for usernames and emails."""
    return canonicalize_identity(value).casefold()
