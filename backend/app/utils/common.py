import json
import re
from typing import Any, Iterable

URL_SAFE_PROTOCOLS = {"http", "https"}
INSTAGRAM_HANDLE_REGEX = re.compile(r"^[A-Za-z0-9._]{1,30}$")


def safe_json_list(raw_value: Any) -> list[Any]:
    """Parse a JSON list field safely; return [] for invalid values."""
    if not raw_value:
        return []
    try:
        data = json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_compact(value: Any) -> str:
    return "".join(ch for ch in normalize_text(value) if ch.isalnum())


def unique_non_empty_strings(values: Iterable[Any]) -> list[str]:
    normalized_values: list[str] = []
    seen = set()
    for item in values:
        cleaned = str(item or "").strip()
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized_values.append(cleaned)
    return normalized_values
