"""Where the engine keeps analyses, cached responses and the Qloo counters: files in .cache/ and memory locally, or
Postgres when DATABASE_URL is set and Redis when the Upstash variables are set (on Vercel, where an instance keeps
nothing between requests, a poll can land on another instance and several instances share one Qloo limit)."""

from __future__ import annotations

import asyncio
import gzip
import json
import logging
import random
import time
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any, Protocol

import httpx

from .config import get_settings
from .models import Analysis, ErrorBody, Filters

if TYPE_CHECKING:
    from psycopg_pool import AsyncConnectionPool

log = logging.getLogger("echo.store")

# A running analysis saves after every step. One that hasn't saved for this long has stopped (its instance was
# recycled, say): it reads as failed and isn't reused.
STALE_SECONDS = 180
# About 1 MB of gzipped cache per fresh analysis: expired rows are deleted on about one write in 100.
CLEANUP_CHANCE = 0.01
# Qloo allows 10 a second; one less leaves room for clocks that don't quite agree.
REQUESTS_PER_SECOND = 9

Sleep = Callable[[float], Awaitable[None]]


def today() -> str:
    return datetime.now(UTC).date().isoformat()


def request_key(show_id: str, filters: Filters) -> str:
    """Without a theme, the key is the same as before themes existed, so earlier runs are still found."""
    exclude: dict[str, Any] = {"episode_about": {"used"}}
    if filters.theme is None:
        exclude["theme"] = True
    return json.dumps([show_id.upper(), filters.model_dump(exclude=exclude)], sort_keys=True)


def key_of(analysis: Analysis) -> str:
    return request_key(analysis.show.id, analysis.filters)


def checked(analysis: Analysis, saved_at: float) -> Analysis:
    if analysis.status == "running" and time.time() - saved_at > STALE_SECONDS:
        error = ErrorBody(error="engine_error", message="This analysis stopped before it finished. Start it again.")
        return analysis.model_copy(update={"status": "failed", "error": error})
    return analysis


def reusable(analysis: Analysis) -> bool:
    return analysis.status in ("running", "done")


class Cache(Protocol):
    async def get(self, key: str) -> Any | None: ...

    async def set(self, key: str, path: str, params: dict[str, str], response: Any) -> None: ...


class AnalysisStore(Protocol):
    async def get(self, analysis_id: str) -> Analysis | None: ...

    async def put(self, analysis: Analysis) -> None: ...

    async def find(self, key: str) -> Analysis | None:
        """The newest running or finished analysis for this request key."""
        ...

    async def set_featured(self, analysis_ids: list[str]) -> None:
        """Replaces the featured analyses, in order."""
        ...

    async def featured(self) -> list[Analysis]:
        """The featured analyses, in order. One that is gone is left out."""
        ...

    async def close(self) -> None: ...


class Limiter(Protocol):
    async def wait(self, sleep: Sleep) -> None:
        """Returns when the next Qloo call may go."""
        ...


class Counters(Protocol):
    """Today's fresh Qloo calls, for the daily cap, and the monthly quota Qloo last reported."""

    async def take_call(self, cap: int) -> bool:
        """Counts one fresh call, or returns False without counting it when today's count has reached `cap`."""
        ...

    async def calls_today(self) -> int: ...

    async def set_month_left(self, remaining: int) -> None: ...

    async def month_left(self) -> int | None: ...

    async def save(self) -> None:
        """Called when a Qloo client closes."""
        ...

    async def close(self) -> None: ...


# Local --------------------------------------------------------------------------------------------------------


class DiskCache:
    """One JSON file per request, expired after `ttl_seconds`."""

    def __init__(self, directory: Path, ttl_seconds: float) -> None:
        self.directory = directory
        self.ttl_seconds = ttl_seconds
        directory.mkdir(parents=True, exist_ok=True)

    def _file(self, key: str) -> Path:
        return self.directory / f"{key}.json"

    async def get(self, key: str) -> Any | None:
        try:
            entry = json.loads(self._file(key).read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            return None
        if time.time() - entry["saved_at"] > self.ttl_seconds:
            return None
        return entry["response"]

    async def set(self, key: str, path: str, params: dict[str, str], response: Any) -> None:
        entry = {"saved_at": time.time(), "path": path, "params": params, "response": response}
        tmp = self._file(key).with_suffix(".tmp")
        tmp.write_text(json.dumps(entry))
        tmp.replace(self._file(key))


FEATURED_FILE = "featured.txt"


class LocalStore:
    """Analyses in memory, and as JSON files in `directory` when there is one, so they survive a restart. The
    featured analyses' IDs are in `featured.txt` there, one a line."""

    def __init__(self, directory: Path | None) -> None:
        self.directory = directory
        self.analyses: dict[str, tuple[Analysis, float]] = {}
        self.featured_ids: list[str] = []
        if directory and directory.exists():
            if (directory / FEATURED_FILE).exists():
                self.featured_ids = (directory / FEATURED_FILE).read_text().split()
            for file in sorted(directory.glob("*.json")):
                try:
                    analysis = Analysis.model_validate_json(file.read_text())
                except (OSError, ValueError):
                    log.warning("skipped saved analysis %s: it doesn't match the contract", file.name)
                    continue
                self.analyses[analysis.id] = (analysis, file.stat().st_mtime)

    def remember(self, analysis: Analysis) -> None:
        self.analyses[analysis.id] = (analysis, time.time())

    async def get(self, analysis_id: str) -> Analysis | None:
        item = self.analyses.get(analysis_id)
        return checked(*item) if item else None

    async def put(self, analysis: Analysis) -> None:
        self.remember(analysis)
        if self.directory:
            self.directory.mkdir(parents=True, exist_ok=True)
            tmp = self.directory / f"{analysis.id}.tmp"
            tmp.write_text(analysis.model_dump_json())
            tmp.replace(self.directory / f"{analysis.id}.json")

    async def find(self, key: str) -> Analysis | None:
        found = [(saved_at, a) for a, saved_at in self.analyses.values() if key_of(a) == key]
        for saved_at, analysis in sorted(found, key=lambda item: item[0], reverse=True):
            if reusable(current := checked(analysis, saved_at)):
                return current
        return None

    async def set_featured(self, analysis_ids: list[str]) -> None:
        self.featured_ids = list(analysis_ids)
        if self.directory:
            self.directory.mkdir(parents=True, exist_ok=True)
            (self.directory / FEATURED_FILE).write_text("".join(f"{i}\n" for i in analysis_ids))

    async def featured(self) -> list[Analysis]:
        found = [await self.get(i) for i in self.featured_ids]
        return [analysis for analysis in found if analysis is not None]

    async def close(self) -> None:
        pass


class RateLimiter:
    """Spaces this process's calls evenly, `per_second` at most."""

    def __init__(self, per_second: float) -> None:
        self.interval = 1 / per_second
        self._next_slot = 0.0

    async def wait(self, sleep: Sleep) -> None:
        now = time.monotonic()
        slot = max(now, self._next_slot)
        self._next_slot = slot + self.interval
        if slot > now:
            await sleep(slot - now)


class LocalCounters:
    """Counts in memory. Today's count is written to `path`, when there is one, as each Qloo client closes, so it
    survives a restart."""

    def __init__(self, path: Path | None) -> None:
        self.path = path
        self.day, self.calls = today(), 0
        self.remaining: int | None = None
        if path and path.exists():
            saved = json.loads(path.read_text())
            if saved.get("day") == self.day:
                self.calls = int(saved.get("calls", 0))

    async def take_call(self, cap: int) -> bool:
        if self.day != today():
            self.day, self.calls = today(), 0
        if self.calls >= cap:
            return False
        self.calls += 1
        return True

    async def calls_today(self) -> int:
        return self.calls if self.day == today() else 0

    async def set_month_left(self, remaining: int) -> None:
        self.remaining = remaining

    async def month_left(self) -> int | None:
        return self.remaining

    async def save(self) -> None:
        if self.path:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps({"day": self.day, "calls": self.calls}))

    async def close(self) -> None:
        pass


# Postgres -----------------------------------------------------------------------------------------------------

SCHEMA = """
create table if not exists analyses (
    id text primary key,
    request_key text not null,
    status text not null,
    body jsonb not null,
    saved_at timestamptz not null default now()
);
create index if not exists analyses_request on analyses (request_key, saved_at desc);
create table if not exists cache (
    key text primary key,
    body bytea not null,
    expires_at timestamptz not null
);
create table if not exists featured (
    position integer primary key,
    analysis_id text not null
);
"""


class Postgres:
    """One connection pool per process, opened on first use. Neon's pooler doesn't keep prepared statements, so
    psycopg never prepares them."""

    def __init__(self, url: str) -> None:
        self.url = url
        self._pool: AsyncConnectionPool | None = None
        self._lock: asyncio.Lock | None = None

    async def pool(self) -> AsyncConnectionPool:
        if self._pool is not None:
            return self._pool
        self._lock = self._lock or asyncio.Lock()
        async with self._lock:
            if self._pool is None:
                from psycopg_pool import AsyncConnectionPool

                pool = AsyncConnectionPool(
                    self.url,
                    min_size=1,
                    max_size=4,
                    open=False,
                    kwargs={"autocommit": True, "prepare_threshold": None},
                )
                await pool.open()
                async with pool.connection() as conn:
                    await conn.execute(SCHEMA)
                self._pool = pool
        return self._pool

    async def execute(self, sql: str, args: tuple = ()) -> list[tuple]:
        pool = await self.pool()
        async with pool.connection() as conn, conn.cursor() as cursor:
            await cursor.execute(sql, args)
            return await cursor.fetchall() if cursor.description else []

    async def transaction(self, statements: list[tuple[str, tuple]]) -> None:
        pool = await self.pool()
        async with pool.connection() as conn, conn.transaction():
            for sql, args in statements:
                await conn.execute(sql, args)

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None


class PostgresCache:
    def __init__(self, db: Postgres, namespace: str, ttl_seconds: float) -> None:
        self.db = db
        self.namespace = namespace
        self.ttl_seconds = ttl_seconds

    async def get(self, key: str) -> Any | None:
        rows = await self.db.execute(
            "select body from cache where key = %s and expires_at > now()", (f"{self.namespace}:{key}",)
        )
        return json.loads(gzip.decompress(rows[0][0])) if rows else None

    async def set(self, key: str, path: str, params: dict[str, str], response: Any) -> None:
        body = gzip.compress(json.dumps(response, separators=(",", ":")).encode())
        await self.db.execute(
            "insert into cache (key, body, expires_at) values (%s, %s, now() + make_interval(secs => %s)) "
            "on conflict (key) do update set body = excluded.body, expires_at = excluded.expires_at",
            (f"{self.namespace}:{key}", body, self.ttl_seconds),
        )
        if random.random() < CLEANUP_CHANCE:
            await self.db.execute("delete from cache where expires_at < now()")


class PostgresStore:
    def __init__(self, db: Postgres) -> None:
        self.db = db

    @staticmethod
    def _row(row: tuple) -> Analysis:
        body, saved_at = row
        return checked(Analysis.model_validate(body), saved_at.timestamp())

    async def get(self, analysis_id: str) -> Analysis | None:
        rows = await self.db.execute("select body, saved_at from analyses where id = %s", (analysis_id,))
        return self._row(rows[0]) if rows else None

    async def put(self, analysis: Analysis) -> None:
        await self.db.execute(
            "insert into analyses (id, request_key, status, body, saved_at) values (%s, %s, %s, %s::jsonb, now()) "
            "on conflict (id) do update set status = excluded.status, body = excluded.body, saved_at = now()",
            (analysis.id, key_of(analysis), analysis.status, analysis.model_dump_json()),
        )

    async def find(self, key: str) -> Analysis | None:
        rows = await self.db.execute(
            "select body, saved_at from analyses where request_key = %s and status in ('running', 'done') "
            "order by saved_at desc limit 5",
            (key,),
        )
        for row in rows:
            if reusable(analysis := self._row(row)):
                return analysis
        return None

    async def set_featured(self, analysis_ids: list[str]) -> None:
        insert = "insert into featured (position, analysis_id) values (%s, %s)"
        rows = [(insert, (position, analysis_id)) for position, analysis_id in enumerate(analysis_ids)]
        await self.db.transaction([("delete from featured", ()), *rows])

    async def featured(self) -> list[Analysis]:
        rows = await self.db.execute(
            "select a.body, a.saved_at from featured f join analyses a on a.id = f.analysis_id order by f.position"
        )
        return [self._row(row) for row in rows]

    async def close(self) -> None:
        await self.db.close()


# Redis --------------------------------------------------------------------------------------------------------


# Every key expires: the tests can share the production database under their own prefix.
REDIS_PREFIX = "echo:qloo:"


class RedisError(RuntimeError):
    pass


class Upstash:
    """Upstash Redis over its REST API: each pipeline of commands is one HTTPS request, so there is no Redis
    connection to lose when Vercel freezes an instance. The HTTP client opens on first use."""

    def __init__(self, url: str, token: str, *, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.url = url.rstrip("/")
        self.token = token
        self.transport = transport
        self._http: httpx.AsyncClient | None = None

    async def pipeline(self, *commands: list[str | int]) -> list[Any]:
        if self._http is None:
            self._http = httpx.AsyncClient(
                base_url=self.url,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=5,
                transport=self.transport,
            )
        body = [[str(part) for part in command] for command in commands]
        try:
            response = await self._http.post("/pipeline", json=body)
        except httpx.HTTPError as error:
            # Never an httpx error, so the Qloo client can't take it for one of Qloo's and retry.
            raise RedisError(f"Upstash didn't answer: {error!r}") from error
        if response.status_code != 200:
            raise RedisError(f"Upstash returned {response.status_code}: {response.text[:200]}")
        results = response.json()
        for result in results:
            if "error" in result:
                raise RedisError(f"Upstash: {result['error']}")
        return [result["result"] for result in results]

    async def command(self, *parts: str | int) -> Any:
        return (await self.pipeline(list(parts)))[0]

    async def close(self) -> None:
        if self._http is not None:
            await self._http.aclose()
            self._http = None


class RedisLimiter:
    """At most `per_second` calls in each clock second, counted in Redis so every instance shares the one limit.
    A call that finds its second full waits for the next one."""

    def __init__(
        self, redis: Upstash, per_second: int, clock: Callable[[], float] = time.time, prefix: str = REDIS_PREFIX
    ) -> None:
        self.redis = redis
        self.per_second = per_second
        self.clock = clock
        self.prefix = prefix

    async def wait(self, sleep: Sleep) -> None:
        while True:
            second = int(self.clock())
            key = f"{self.prefix}second:{second}"
            calls, _ = await self.redis.pipeline(["INCR", key], ["EXPIRE", key, 10])
            if calls <= self.per_second:
                return
            await sleep(max(0.0, second + 1 - self.clock()))


class RedisCounters:
    """One counter per UTC day and the last monthly quota, both expiring once they no longer matter. Every call is
    counted as it's made, so instances never need to save."""

    def __init__(self, redis: Upstash, prefix: str = REDIS_PREFIX) -> None:
        self.redis = redis
        self.prefix = prefix

    def _day_key(self) -> str:
        return f"{self.prefix}calls:{today()}"

    async def take_call(self, cap: int) -> bool:
        key = self._day_key()
        calls, _ = await self.redis.pipeline(["INCR", key], ["EXPIRE", key, 2 * 86400])
        if calls <= cap:
            return True
        await self.redis.command("DECR", key)
        return False

    async def calls_today(self) -> int:
        return int(await self.redis.command("GET", self._day_key()) or 0)

    async def set_month_left(self, remaining: int) -> None:
        await self.redis.command("SET", f"{self.prefix}month_left", remaining, "EX", 40 * 86400)

    async def month_left(self) -> int | None:
        value = await self.redis.command("GET", f"{self.prefix}month_left")
        return None if value is None else int(value)

    async def save(self) -> None:
        pass

    async def close(self) -> None:
        await self.redis.close()


# Choosing ---------------------------------------------------------------------------------------------------


LOCAL_LIMITER = RateLimiter(REQUESTS_PER_SECOND)


@lru_cache
def postgres(url: str) -> Postgres:
    return Postgres(url)


@lru_cache
def upstash(url: str, token: str) -> Upstash:
    return Upstash(url, token)


def analysis_store(directory: Path | None) -> AnalysisStore:
    url = get_settings().database_url
    return PostgresStore(postgres(url)) if url else LocalStore(directory)


def response_cache(namespace: str, ttl_seconds: float) -> Cache:
    settings = get_settings()
    if settings.database_url:
        return PostgresCache(postgres(settings.database_url), namespace, ttl_seconds)
    return DiskCache(settings.cache_dir / namespace, ttl_seconds)


def qloo_limiter() -> Limiter:
    settings = get_settings()
    if settings.upstash_url:
        return RedisLimiter(upstash(settings.upstash_url, settings.upstash_token), REQUESTS_PER_SECOND)
    return LOCAL_LIMITER


@lru_cache
def qloo_counters() -> Counters:
    settings = get_settings()
    if settings.upstash_url:
        return RedisCounters(upstash(settings.upstash_url, settings.upstash_token))
    return LocalCounters(settings.cache_dir / "usage.json")
