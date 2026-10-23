"""The local and the hosted backends behave the same. Postgres tests run when TEST_DATABASE_URL points at a throwaway
database, which they empty. Redis tests run on a fake Upstash, and on a real one when TEST_UPSTASH_REDIS_REST_URL and
TEST_UPSTASH_REDIS_REST_TOKEN are set: they use their own keys, which expire, so the production database will do."""

import asyncio
import os
import time
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from echo_engine import apple, config, store
from echo_engine.app import create_app
from echo_engine.config import Settings
from echo_engine.models import Analysis, Filters, Show, Step
from echo_engine.qloo_client import QlooClient
from echo_engine.store import (
    STALE_SECONDS,
    LocalCounters,
    LocalStore,
    Postgres,
    PostgresCache,
    PostgresStore,
    RedisCounters,
    RedisError,
    RedisLimiter,
    Upstash,
    request_key,
)
from tests.fake_qloo import SHOW_ID, handler
from tests.fake_upstash import FakeUpstash

DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")
needs_postgres = pytest.mark.skipif(not DATABASE_URL, reason="TEST_DATABASE_URL isn't set")
REDIS_URL = os.environ.get("TEST_UPSTASH_REDIS_REST_URL", "")
REDIS_TOKEN = os.environ.get("TEST_UPSTASH_REDIS_REST_TOKEN", "")
needs_redis = pytest.mark.skipif(not (REDIS_URL and REDIS_TOKEN), reason="TEST_UPSTASH_REDIS_REST_* aren't set")


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
    await db.execute("drop table if exists analyses, cache, featured")
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


@pytest.mark.parametrize("kind", KINDS)
def test_featured_analyses_keep_their_order_and_are_replaced(kind, tmp_path):
    async def check() -> None:
        store = await make_store(kind, tmp_path)
        assert await store.featured() == []
        await store.put(analysis("an_1", "done"))
        await store.put(analysis("an_2", "done", fame="rising"))
        await store.set_featured(["an_2", "an_gone", "an_1"])
        assert [a.id for a in await store.featured()] == ["an_2", "an_1"]
        await store.set_featured(["an_1"])
        assert [a.id for a in await store.featured()] == ["an_1"]
        await store.close()

    asyncio.run(check())


def test_local_featured_analyses_survive_a_restart(tmp_path):
    async def check() -> None:
        store = LocalStore(tmp_path)
        await store.put(analysis("an_1", "done"))
        await store.set_featured(["an_1"])
        assert [a.id for a in await LocalStore(tmp_path).featured()] == ["an_1"]

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
    with TestClient(create_app(mock=False, client_factory=fake_client, store=store)) as client:
        started = client.post("/analyses", json={"show_id": SHOW_ID}).json()["id"]
        assert client.get(f"/analyses/{started}").json()["status"] == "done"
        assert client.post("/analyses", json={"show_id": SHOW_ID}).json()["id"] == started
    assert puts.count("running") >= 7  # created, then once after each of the 6 steps
    assert puts[-1] == "done"

    restarted = create_app(mock=False, client_factory=fake_client, store=PostgresStore(Postgres(DATABASE_URL)))
    with TestClient(restarted) as again:
        assert again.get(f"/analyses/{started}").json()["status"] == "done"


# Counters -----------------------------------------------------------------------------------------------------

COUNTER_KINDS = ["local", "fake_redis", pytest.param("redis", marks=needs_redis)]


async def make_counters(kind: str, tmp_path):
    if kind == "local":
        return LocalCounters(tmp_path / "usage.json")
    if kind == "fake_redis":
        return RedisCounters(FakeUpstash().client())
    return RedisCounters(Upstash(REDIS_URL, REDIS_TOKEN), prefix=f"echo:test:{uuid4().hex}:")


@pytest.mark.parametrize("kind", COUNTER_KINDS)
def test_counters_stop_at_the_cap_and_keep_the_quota(kind, tmp_path):
    async def check() -> None:
        counters = await make_counters(kind, tmp_path)
        assert await counters.calls_today() == 0
        assert await counters.month_left() is None
        assert [await counters.take_call(cap=3) for _ in range(4)] == [True, True, True, False]
        assert await counters.calls_today() == 3
        await counters.set_month_left(49107)
        assert await counters.month_left() == 49107
        await counters.close()

    asyncio.run(check())


@pytest.mark.parametrize("kind", COUNTER_KINDS)
def test_the_count_starts_again_each_day(kind, tmp_path, monkeypatch):
    async def check() -> None:
        counters = await make_counters(kind, tmp_path)
        monkeypatch.setattr(store, "today", lambda: "2026-10-23")
        assert await counters.take_call(cap=1)
        assert not await counters.take_call(cap=1)
        monkeypatch.setattr(store, "today", lambda: "2026-10-24")
        assert await counters.calls_today() == 0
        assert await counters.take_call(cap=1)
        await counters.close()

    asyncio.run(check())


def test_redis_counters_are_shared_by_every_instance():
    async def check() -> None:
        fake = FakeUpstash()
        one, two = RedisCounters(fake.client()), RedisCounters(fake.client())
        assert await one.take_call(cap=3)
        assert await one.take_call(cap=3)
        assert await two.take_call(cap=3)
        assert not await two.take_call(cap=3)
        assert not await one.take_call(cap=3)
        assert await one.calls_today() == await two.calls_today() == 3
        await one.set_month_left(49000)
        assert await two.month_left() == 49000

    asyncio.run(check())


def test_the_redis_limiter_allows_nine_a_second_across_instances():
    clock = [1000.25]
    sleeps: list[float] = []

    async def sleep(seconds: float) -> None:
        sleeps.append(seconds)
        clock[0] += seconds

    async def check() -> list[int]:
        fake = FakeUpstash()
        limiters = [RedisLimiter(fake.client(), 9, clock=lambda: clock[0]) for _ in range(2)]
        seconds = []
        for i in range(12):
            await limiters[i % 2].wait(sleep)
            seconds.append(int(clock[0]))
        return seconds

    seconds = asyncio.run(check())
    assert seconds == [1000] * 9 + [1001] * 3
    assert sleeps == [0.75]


def test_upstash_errors_say_what_failed_without_the_token():
    async def check() -> None:
        with pytest.raises(RedisError, match="401") as error:
            await FakeUpstash().client(token="wrong-token").command("GET", "k")
        assert "wrong-token" not in str(error.value)
        with pytest.raises(RedisError, match="unknown command"):
            await FakeUpstash().client().command("NOPE")

    asyncio.run(check())


def test_the_upstash_variables_choose_redis(monkeypatch):
    monkeypatch.setattr(config, "load_dotenv", lambda *args, **kwargs: None)
    for name in ("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(store, "get_settings", Settings)
    assert isinstance(store.qloo_counters.__wrapped__(), LocalCounters)
    assert store.qloo_limiter() is store.LOCAL_LIMITER

    monkeypatch.setenv("KV_REST_API_URL", "kv.example.com")  # as Upstash's console copies it
    monkeypatch.setenv("KV_REST_API_TOKEN", "kv-token")
    assert store.qloo_counters.__wrapped__().redis.url == "https://kv.example.com"
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://upstash.example.com")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "upstash-token")
    limiter = store.qloo_limiter()
    assert isinstance(limiter, RedisLimiter)
    assert limiter.redis.url == "https://upstash.example.com"


def test_two_engines_on_one_redis_share_the_daily_cap_and_the_quota(monkeypatch, tmp_path):
    async def author(itunes_id: str) -> str:
        return "Example Network"

    async def titles(itunes_id: str, limit: int = 50) -> list[str]:
        return []

    monkeypatch.setattr(apple, "author", author)
    monkeypatch.setattr(apple, "episode_titles", titles)

    def with_quota(request: httpx.Request) -> httpx.Response:
        response = handler(request)
        response.headers["x-month-ratelimit-remaining"] = "49000"
        return response

    def fake_client(**kwargs) -> QlooClient:
        return QlooClient(api_key="k", transport=httpx.MockTransport(with_quota), limiter=None, **kwargs)

    fake = FakeUpstash()

    def instance(name: str) -> TestClient:
        app = create_app(
            mock=False,
            client_factory=fake_client,
            store=LocalStore(tmp_path / name),
            counters=RedisCounters(fake.client()),
        )
        return TestClient(app)

    one, two = instance("one"), instance("two")
    assert one.post("/analyses", json={"show_id": SHOW_ID}).status_code == 202
    health = two.get("/health").json()
    assert health["qloo_calls_today"] > 0
    assert health["qloo_calls_left"] == 49000

    two.app.state.engine.daily_cap = health["qloo_calls_today"]
    response = two.get("/shows", params={"q": "something new"})
    assert response.status_code == 429
    assert response.json()["error"] == "daily_cap"
