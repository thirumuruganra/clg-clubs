from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock
from typing import Iterable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


@dataclass(frozen=True)
class RateLimitRule:
    path_prefix: str
    limit: int
    window_seconds: int
    methods: frozenset[str]


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter for targeted sensitive endpoints."""

    def __init__(self, app, rules: Iterable[RateLimitRule]) -> None:
        super().__init__(app)
        self._rules = tuple(rules)
        self._events: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _resolve_client_ip(self, request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        if forwarded_for:
            first_ip = forwarded_for.split(",", 1)[0].strip()
            if first_ip:
                return first_ip
        return request.client.host if request.client else "unknown"

    def _matching_rule(self, path: str, method: str) -> RateLimitRule | None:
        normalized_method = method.upper()
        for rule in self._rules:
            if path.startswith(rule.path_prefix) and normalized_method in rule.methods:
                return rule
        return None

    async def dispatch(self, request: Request, call_next):
        rule = self._matching_rule(request.url.path, request.method)
        if rule is None:
            return await call_next(request)

        now = time.time()
        window_start = now - rule.window_seconds
        key = (self._resolve_client_ip(request), rule.path_prefix)

        with self._lock:
            events = self._events[key]
            while events and events[0] < window_start:
                events.popleft()

            if len(events) >= rule.limit:
                retry_after_seconds = int(max(1, events[0] + rule.window_seconds - now))
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests"},
                    headers={"Retry-After": str(retry_after_seconds)},
                )

            events.append(now)

        return await call_next(request)
