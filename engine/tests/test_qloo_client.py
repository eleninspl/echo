import asyncio
import json

import httpx
import pytest

from echo_engine.params import InvalidParamError, check_insights_params
from echo_engine.qloo_client import (
    DiskCache,
    QlooClient,
    QlooError,
    Quota,
    RateLimiter,
    cache_key,
    normalize_params,
)

PERSON_QUERY = {"filter.type": "urn:entity:person", "signal.interests.entities": "abc", "take": 5}


def make_client(handler, tmp_path=None, **kwargs) -> QlooClient:
    cache = DiskCache(tmp_path / "qloo", ttl_seconds=3600) if tmp_path else None
    sleeps: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    client = QlooClient(
        api_key="test-key",
        base_url="https://hackathon.api.qloo.com",
        cache=cache,
        transport=httpx.MockTransport(handler),
        sleep=fake_sleep,
        limiter=None,
        **kwargs,
    )
    client.sleeps = sleeps  # type: ignore[attr-defined]
    return client


def run(coro):
    return asyncio.run(coro)


def test_normalize_params_joins_lists_and_drops_none():
    assert normalize_params({"a": ["x", "y"], "b": None, "c": True, "d": 3}) == {"a": "x,y", "c": "true", "d": "3"}


def test_cache_key_ignores_param_order():
    assert cache_key("/v2/insights", {"a": "1", "b": "2"}) == cache_key("/v2/insights", {"b": "2", "a": "1"})
    assert cache_key("/v2/insights", {"a": "1"}) != cache_key("/search", {"a": "1"})


def test_sends_key_header_and_get_query(tmp_path):
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"results": {"entities": []}})

    client = make_client(handler, tmp_path)
    run(client.insights(PERSON_QUERY))
    assert seen[0].method == "GET"
    assert seen[0].headers["X-Api-Key"] == "test-key"
    assert seen[0].url.params["filter.type"] == "urn:entity:person"


def test_cache_hit_skips_network(tmp_path):
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(200, json={"results": {"entities": [{"name": "X"}]}})

    first = make_client(handler, tmp_path)
    run(first.insights(PERSON_QUERY))
    second = make_client(handler, tmp_path)  # fresh client, same disk cache
    data = run(second.insights(PERSON_QUERY))
    assert calls == 1
    assert data["results"]["entities"][0]["name"] == "X"
    assert second.log[0].cached is True


def test_expired_cache_entry_is_refetched(tmp_path):
    cache = DiskCache(tmp_path, ttl_seconds=-1)
    cache.set("k", "/search", {}, {"x": 1})
    assert cache.get("k") is None


def test_retries_429_then_succeeds_honouring_retry_after():
    responses = iter(
        [
            httpx.Response(429, headers={"Retry-After": "2"}),
            httpx.Response(503),
            httpx.Response(200, json={"results": []}),
        ]
    )
    client = make_client(lambda request: next(responses))
    assert run(client.search("lex")) == []
    assert client.sleeps[0] == 2.0
    assert len(client.sleeps) == 2


def test_client_error_is_not_retried():
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(403, text="forbidden")

    client = make_client(handler)
    with pytest.raises(QlooError) as err:
        run(client.search("lex"))
    assert err.value.status == 403
    assert calls == 1


def test_gives_up_after_max_retries():
    client = make_client(lambda request: httpx.Response(500), max_retries=2)
    with pytest.raises(QlooError):
        run(client.search("lex"))
    assert len(client.sleeps) == 2


def test_call_log_never_contains_the_key(tmp_path):
    client = make_client(lambda request: httpx.Response(200, json={"results": []}), tmp_path)
    run(client.search("lex"))
    assert "test-key" not in json.dumps([record.to_dict() for record in client.log])


def test_param_guard_rejects_undocumented_param():
    with pytest.raises(InvalidParamError):
        check_insights_params({"filter.type": "urn:entity:person", "filter.release_year.min": 2000})


def test_param_guard_rejects_gender_and_audiences_even_though_qloo_accepts_them():
    for param, value in [
        ("signal.demographics.gender", "female"),
        ("signal.demographics.audiences", "urn:audience:x"),
        ("filter.gender", "female"),
        ("filter.date_of_birth.min", "2000-01-01"),
    ]:
        with pytest.raises(InvalidParamError, match="privacy"):
            check_insights_params({"filter.type": "urn:entity:person", param: value})


def test_param_guard_allows_the_v1_signals():
    check_insights_params(
        {
            "filter.type": "urn:entity:person",
            "signal.interests.entities": "a",
            "signal.interests.entities.weight": "very_high",
            "signal.demographics.age": "25_to_29",
            "signal.location.query": "Greece",
        }
    )
    check_insights_params(
        {"filter.type": "urn:tag", "signal.interests.entities": "a", "filter.tag.types": "t", "take": 50}
    )
    check_insights_params({"filter.type": "urn:demographics", "signal.interests.entities": "a,b"})
    with pytest.raises(InvalidParamError):
        check_insights_params({"filter.type": "urn:demographics", "take": 5})


def test_param_guard_accepts_documented_params():
    check_insights_params(
        {
            "filter.type": "urn:entity:podcast",
            "signal.interests.entities": "a",
            "filter.results.entities": "b",
            "feature.explainability": True,
            "take": 10,
        }
    )


def test_param_guard_rejects_unknown_type():
    with pytest.raises(InvalidParamError):
        check_insights_params({"filter.type": "urn:entity:music"})


def test_invalid_params_never_reach_the_network():
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("should not be called")

    client = make_client(handler)
    with pytest.raises(InvalidParamError):
        run(client.insights({"filter.type": "urn:entity:person", "filter.bogus": 1}))


def test_normalize_params_sorts_sets_for_a_stable_cache_key():
    assert normalize_params({"ids": {"c", "a", "b"}}) == {"ids": "a,b,c"}


def test_videogame_is_the_working_type_name():
    check_insights_params({"filter.type": "urn:entity:videogame", "signal.interests.entities": "abc"})
    with pytest.raises(InvalidParamError):
        check_insights_params({"filter.type": "urn:entity:video_game", "signal.interests.entities": "abc"})


def test_rate_limiter_spaces_requests():
    waits: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        waits.append(seconds)

    limiter = RateLimiter(10)

    async def three() -> None:
        for _ in range(3):
            await limiter.wait(fake_sleep)

    run(three())
    assert len(waits) == 2
    assert all(0.05 < w <= 0.2 for w in waits)


def test_quota_reads_the_month_header():
    quota = Quota()
    quota.update(httpx.Response(200, headers={"x-month-ratelimit-remaining": "49107"}))
    assert quota.month_remaining == 49107
