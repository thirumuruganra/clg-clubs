import json
import os
from typing import Any, Iterable

NON_PRODUCTION_APP_ENVS = {"development", "dev", "local", "test", "testing"}


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


def parse_csv_env(var_name: str, default_values: list[str]) -> list[str]:
    """Parse a comma-separated env var into a stripped list, falling back to defaults."""
    raw_value = os.getenv(var_name, "").strip()
    if not raw_value:
        return default_values
    return [value.strip() for value in raw_value.split(",") if value.strip()]


def is_production_environment() -> bool:
    # Fail closed: anything other than an explicit non-production value is
    # treated as production, so a missing/misconfigured APP_ENV config var
    # on the deployment platform can't silently disable Secure cookies,
    # HTTPS-only sessions, or the dev admin-email allowlist.
    return os.getenv("APP_ENV", "production").strip().lower() not in NON_PRODUCTION_APP_ENVS


def require_env(var_name: str) -> str:
    value = os.getenv(var_name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {var_name}")
    return value


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
