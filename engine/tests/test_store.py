"""The two stores behave the same. Postgres tests run when TEST_DATABASE_URL points at a throwaway database."""

import asyncio
import os
import time

import httpx
import pytest
from fastapi.testclient import TestClient

from echo_engine import apple, store
from echo_engine.app import create_app
from echo_engine.models import Analysis, Filters, Show, Step
from echo_engine.qloo_client import QlooClient
from echo_engine.store import STALE_SECONDS, LocalStore, Postgres, PostgresCache, PostgresStore, request_key
from tests.fake_qloo import SHOW_ID, handler

DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")
needs_postgres = pytest.mark.skipif(not DATABASE_URL, reason="TEST_DATABASE_URL isn't set")


def analysis(analysis_id: str, status: str = "running", fame: str = "any") -> Analysis:
    return Analysis(
        id=analysis_id,
        status=status,
        show=Show(id=SHOW_ID, title="Example Show"),
        filters=Filters(fame=fame),
        steps=[Step(key="map", label="Mapping your audience")],
    )


async def fresh_postgres() -> Postgres:
    db = Postgres(DATABASE_URL)
    await db.execute("drop table if exists analyses, cache")
    await db.close()
    return Postgres(DATABASE_URL)


async def make_store(kind: str, tmp_path):
    if kind == "local":
        return LocalStore(tmp_path / "analyses")
    return PostgresStore(await fresh_postgres())


async def make_stale(store, analysis_id: str) -> None:
    if isinstance(store, LocalStore):
        item, _ = store.analyses[analysis_id]
        store.analyses[analysis_id] = (item, time.time() - STALE_SECONDS - 1)
    else:
        await store.db.execute(
            "update analyses set saved_at = now() - make_interval(secs => %s) where id = %s",
            (STALE_SECONDS + 1, analysis_id),
        )


KINDS = ["local", pytest.param("postgres", marks=needs_postgres)]


@pytest.mark.parametrize("kind", KINDS)
def test_put_get_and_find(kind, tmp_path):
    async def check() -> None:
        store = await make_store(kind, tmp_path)
        key = request_key(SHOW_ID, Filters())
        assert await store.get("an_1") is None
        assert await store.find(key) is None

        await store.put(analysis("an_1"))
        assert (await store.get("an_1")).status == "running"
        assert (await store.find(key)).id == "an_1"
        assert await store.find(request_key(SHOW_ID, Filters(fame="rising"))) is None

        done = analysis("an_1", "done")
        await store.put(done)
        assert (await store.get("an_1")).status == "done"

        await store.put(analysis("an_2", "failed"))
        assert (await store.find(key)).id == "an_1"
        await store.close()

    asyncio.run(check())


@pytest.mark.parametrize("kind", KINDS)
def test_a_stopped_run_reads_as_failed_and_is_not_reused(kind, tmp_path):
    async def check() -> None:
        store = await make_store(kind, tmp_path)
        await store.put(analysis("an_1"))
        await make_stale(store, "an_1")
        stopped = await store.get("an_1")
        assert stopped.status == "failed"
        assert stopped.error.error == "engine_error"
        assert await store.find(request_key(SHOW_ID, Filters())) is None
        await store.close()

    asyncio.run(check())


def test_local_analyses_survive_a_restart(tmp_path):
    async def check() -> None:
        await LocalStore(tmp_path).put(analysis("an_1", "done"))
        assert (await LocalStore(tmp_path).get("an_1")).status == "done"

    asyncio.run(check())


@needs_postgres
def test_postgres_cache_round_trip_expiry_and_cleanup(monkeypatch):
    async def check() -> None:
        db = await fresh_postgres()
        cache = PostgresCache(db, "qloo", ttl_seconds=60)
        assert await cache.get("k") is None
        await cache.set("k", "/search", {"query": "x"}, {"results": [{"name": "X"}]})
        assert await cache.get("k") == {"results": [{"name": "X"}]}
        assert await PostgresCache(db, "apple", ttl_seconds=60).get("k") is None
        await PostgresCache(db, "qloo", ttl_seconds=-1).set("k", "/search", {}, {"old": True})
        assert await cache.get("k") is None
        monkeypatch.setattr(store, "CLEANUP_CHANCE", 1)
        await cache.set("fresh", "/search", {}, {})
        assert await db.execute("select key from cache") == [("qloo:fresh",)]
        await db.close()

    asyncio.run(check())


@needs_postgres
def test_a_full_run_on_postgres_is_saved_and_reused(monkeypatch):
    async def author(itunes_id: str) -> str:
        return "Example Network"

    async def titles(itunes_id: str, limit: int = 50) -> list[str]:
        return []

    monkeypatch.setattr(apple, "author", author)
    monkeypatch.setattr(apple, "episode_titles", titles)

    def fake_client(**kwargs) -> QlooClient:
        return QlooClient(api_key="k", transport=httpx.MockTransport(handler), limiter=None, **kwargs)

    db = asyncio.run(fresh_postgres())
    puts: list[str] = []
    store = PostgresStore(db)
    original_put = store.put

    async def counting_put(item: Analysis) -> None:
        puts.append(item.status)
        await original_put(item)

    store.put = counting_put  # type: ignore[method-assign]
    with TestClient(create_app(mock=False, client_factory=fake_client, store=store, featured=[])) as client:
        started = client.post("/analyses", json={"show_id": SHOW_ID}).json()["id"]
        assert client.get(f"/analyses/{started}").json()["status"] == "done"
        assert client.post("/analyses", json={"show_id": SHOW_ID}).json()["id"] == started
    assert puts.count("running") >= 7  # created, then once after each of the 6 steps
    assert puts[-1] == "done"

    restarted = create_app(mock=False, client_factory=fake_client, store=PostgresStore(Postgres(DATABASE_URL)))
    with TestClient(restarted) as again:
        assert again.get(f"/analyses/{started}").json()["status"] == "done"
