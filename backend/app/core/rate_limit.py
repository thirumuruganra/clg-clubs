from __future__ import annotations

import logging
import os
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock
from typing import Iterable
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RateLimitRule:
    path_prefix: str
    limit: int
    window_seconds: int
    methods: frozenset[str]


class _InMemoryLimiterBackend:
    """Per-process sliding-window limiter. Does not share state across dynos/workers."""

    def __init__(self) -> None:
        self._events: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = Lock()

    async def check(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            events = self._events[key]
            while events and events[0] < window_start:
                events.popleft()

            if len(events) >= limit:
                retry_after = int(max(1, events[0] + window_seconds - now))
                return False, retry_after

            events.append(now)
            return True, 0


class _RedisLimiterBackend:
    """Sliding-window limiter backed by Redis sorted sets, shared across all dynos/workers.

    Fails open (allows the request) if Redis is unreachable, so an outage of the
    rate-limit store degrades to "no rate limiting" rather than taking the app down.
    """

    def __init__(self, redis_url: str) -> None:
        import redis.asyncio as aioredis

        self._client = aioredis.from_url(redis_url, decode_responses=True)

    async def check(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        import redis.exceptions as redis_exceptions

        now = time.time()
        window_start = now - window_seconds
        redis_key = f"ratelimit:{key}"
        member = f"{now}:{uuid4().hex}"

        try:
            async with self._client.pipeline(transaction=True) as pipe:
                pipe.zremrangebyscore(redis_key, 0, window_start)
                pipe.zrange(redis_key, 0, 0, withscores=True)
                pipe.zadd(redis_key, {member: now})
                pipe.zcard(redis_key)
                pipe.expire(redis_key, window_seconds)
                _, oldest, _, count, _ = await pipe.execute()
        except redis_exceptions.RedisError:
            logger.warning("Redis rate-limit backend unavailable; failing open", exc_info=True)
            return True, 0

        if count > limit:
            oldest_score = oldest[0][1] if oldest else now
            retry_after = int(max(1, oldest_score + window_seconds - now))
            return False, retry_after

        return True, 0


def _build_backend():
    redis_url = os.getenv("REDIS_URL", "").strip()
    if not redis_url:
        logger.warning(
            "REDIS_URL not set; using in-memory rate limiter. "
            "This does not share state across multiple dynos/workers."
        )
        return _InMemoryLimiterBackend()

    try:
        return _RedisLimiterBackend(redis_url)
    except Exception:
        logger.exception("Failed to initialize Redis rate-limit backend; falling back to in-memory")
        return _InMemoryLimiterBackend()


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiter for targeted sensitive endpoints.

    Despite the name (kept for import compatibility), this uses a Redis-backed
    sliding window when REDIS_URL is configured, and falls back to an in-memory
    (per-process) window otherwise.
    """

    def __init__(self, app, rules: Iterable[RateLimitRule]) -> None:
        super().__init__(app)
        self._rules = tuple(rules)
        self._backend = _build_backend()

    def _resolve_client_ip(self, request: Request) -> str:
        # request.client.host is resolved by uvicorn's ProxyHeadersMiddleware
        # (--proxy-headers --forwarded-allow-ips) from the single trusted hop
        # (the platform's own router). Re-parsing X-Forwarded-For here would
        # trust a client-supplied, spoofable header instead.
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

        key = f"{rule.path_prefix}:{self._resolve_client_ip(request)}"
        allowed, retry_after_seconds = await self._backend.check(key, rule.limit, rule.window_seconds)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers={"Retry-After": str(retry_after_seconds)},
            )

        return await call_next(request)
