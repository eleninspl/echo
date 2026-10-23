"""Where the engine keeps analyses and cached responses: files in .cache/ locally, or Postgres when DATABASE_URL
is set (on Vercel, where an instance keeps nothing between requests and a poll can land on another instance)."""

from __future__ import annotations

import asyncio
import gzip
import json
import logging
import random
import time
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any, Protocol

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


def request_key(show_id: str, filters: Filters) -> str:
    return json.dumps([show_id.upper(), filters.model_dump(exclude={"episode_about": {"used"}})], sort_keys=True)


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


class LocalStore:
    """Analyses in memory, and as JSON files in `directory` when there is one, so they survive a restart."""

    def __init__(self, directory: Path | None) -> None:
        self.directory = directory
        self.analyses: dict[str, tuple[Analysis, float]] = {}
        if directory and directory.exists():
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

    async def close(self) -> None:
        await self.db.close()


# Choosing ---------------------------------------------------------------------------------------------------


@lru_cache
def postgres(url: str) -> Postgres:
    return Postgres(url)


def analysis_store(directory: Path | None) -> AnalysisStore:
    url = get_settings().database_url
    return PostgresStore(postgres(url)) if url else LocalStore(directory)


def response_cache(namespace: str, ttl_seconds: float) -> Cache:
    settings = get_settings()
    if settings.database_url:
        return PostgresCache(postgres(settings.database_url), namespace, ttl_seconds)
    return DiskCache(settings.cache_dir / namespace, ttl_seconds)
