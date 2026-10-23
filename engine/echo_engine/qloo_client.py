"""Async client for the Qloo hackathon API: a throttle shared by every instance, retries, a private cache, and a log
of every call (without the key) for the "What Qloo saw" panel."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import random
import time
from collections.abc import Awaitable, Callable
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any

import httpx

from .config import get_settings
from .params import check_insights_params
from .store import Cache, Counters, Limiter, RedisError, qloo_counters, qloo_limiter, response_cache

log = logging.getLogger("echo.qloo")
Params = dict[str, Any]
RETRY_STATUSES = {429, 500, 502, 503, 504}


class QlooError(RuntimeError):
    def __init__(self, status: int, path: str, body: str) -> None:
        super().__init__(f"Qloo {path} returned {status}: {body[:300]}")
        self.status = status
        self.path = path
        self.body = body


@dataclass
class CallRecord:
    """One request as the UI's "What Qloo saw" panel shows it. Contains no credentials."""

    path: str
    params: dict[str, str]
    status: int
    duration_ms: int
    cached: bool
    at: str = field(default_factory=lambda: datetime.now(UTC).isoformat(timespec="seconds"))

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def normalize_params(params: Params) -> dict[str, str]:
    """Qloo takes everything in the query string; lists become comma-separated values."""
    out: dict[str, str] = {}
    for key, value in params.items():
        if value is None:
            continue
        if isinstance(value, bool):
            out[key] = "true" if value else "false"
        elif isinstance(value, (set, frozenset)):
            # Set order changes per process, which would change the cache key and the results.
            out[key] = ",".join(sorted(str(v) for v in value))
        elif isinstance(value, (list, tuple)):
            out[key] = ",".join(str(v) for v in value)
        else:
            out[key] = str(value)
    return out


def cache_key(path: str, params: dict[str, str]) -> str:
    raw = json.dumps([path, sorted(params.items())], separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


class QlooClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        cache: Cache | None = None,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        max_concurrency: int = 6,
        max_retries: int = 4,
        timeout: float = 20.0,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        before_fetch: Callable[[], Awaitable[None]] | None = None,
        limiter: Limiter | None = None,
        counters: Counters | None = None,
    ) -> None:
        """Product code makes clients with `from_settings`, which adds the shared throttle and counters."""
        settings = get_settings()
        api_key = api_key if api_key is not None else settings.qloo_api_key
        if not api_key:
            raise RuntimeError("QLOO_API_KEY is not set (put it in the repo-root .env)")
        self._http = httpx.AsyncClient(
            base_url=base_url or settings.qloo_base_url,
            headers={"X-Api-Key": api_key, "Accept": "application/json"},
            timeout=timeout,
            transport=transport,
        )
        self.cache = cache
        self.max_retries = max_retries
        self._sleep = sleep
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._before_fetch = before_fetch
        self._limiter = limiter
        self._counters = counters
        self.log: list[CallRecord] = []

    @classmethod
    def from_settings(cls, **kwargs: Any) -> QlooClient:
        settings = get_settings()
        kwargs.setdefault("limiter", qloo_limiter())
        kwargs.setdefault("counters", qloo_counters())
        return cls(cache=response_cache("qloo", settings.cache_ttl_days * 86400), **kwargs)

    async def __aenter__(self) -> QlooClient:
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._http.aclose()

    async def get(self, path: str, params: Params) -> Any:
        query = normalize_params(params)
        key = cache_key(path, query)
        if self.cache and (hit := await self.cache.get(key)) is not None:
            self.log.append(CallRecord(path, query, 200, 0, cached=True))
            return hit
        if self._before_fetch:
            await self._before_fetch()

        started = time.monotonic()
        async with self._semaphore:
            response = await self._get_with_retries(path, query)
        duration_ms = int((time.monotonic() - started) * 1000)
        self.log.append(CallRecord(path, query, response.status_code, duration_ms, cached=False))

        if response.status_code != 200:
            raise QlooError(response.status_code, path, response.text)
        data = response.json()
        if self.cache:
            await self.cache.set(key, path, query, data)
        return data

    async def _get_with_retries(self, path: str, query: dict[str, str]) -> httpx.Response:
        attempt = 0
        while True:
            if self._limiter:
                await self._limiter.wait(self._sleep)
            try:
                response = await self._http.get(path, params=query)
            except httpx.TransportError:
                if attempt >= self.max_retries:
                    raise
                delay = _backoff(attempt)
            else:
                await self._report_quota(response)
                if response.status_code not in RETRY_STATUSES or attempt >= self.max_retries:
                    return response
                delay = _retry_after(response) or _backoff(attempt)
            attempt += 1
            await self._sleep(delay)

    async def _report_quota(self, response: httpx.Response) -> None:
        """Best effort: the quota is only shown on /health, so a Redis failure here never stops a call."""
        if self._counters is None or (remaining := month_left(response)) is None:
            return
        try:
            await self._counters.set_month_left(remaining)
        except RedisError:
            log.warning("couldn't save the monthly quota", exc_info=True)

    # Endpoint helpers -------------------------------------------------------------------------

    async def search(self, query: str, types: str | list[str] | None = None, take: int = 10) -> list[dict]:
        data = await self.get("/search", {"query": query, "types": types, "take": take})
        return data.get("results", [])

    async def insights(self, params: Params) -> dict:
        check_insights_params(params)
        data = await self.get("/v2/insights", params)
        return data

    async def tags(self, params: Params) -> dict:
        return await self.get("/v2/tags", params)

    async def entities(self, ids: list[str]) -> list[dict]:
        data = await self.get("/entities", {"entity_ids": ids})
        return data.get("results", [])


def month_left(response: httpx.Response) -> int | None:
    remaining = response.headers.get("x-month-ratelimit-remaining", "")
    return int(remaining) if remaining.isdigit() else None


def _backoff(attempt: int) -> float:
    return 0.5 * 2**attempt + random.uniform(0, 0.25)


def _retry_after(response: httpx.Response) -> float | None:
    value = response.headers.get("Retry-After")
    try:
        return min(float(value), 30.0) if value else None
    except ValueError:
        return None
