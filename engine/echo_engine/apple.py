import httpx

from .qloo_client import cache_key
from .store import Cache, response_cache

LOOKUP_URL = "https://itunes.apple.com/lookup"
TTL_SECONDS = 7 * 86400


def _cache() -> Cache:
    return response_cache("apple", TTL_SECONDS)


async def lookup(params: dict[str, str]) -> list[dict]:
    cache = _cache()
    key = cache_key(LOOKUP_URL, params)
    if (hit := await cache.get(key)) is not None:
        return hit
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            response = await client.get(LOOKUP_URL, params=params)
        results = response.json().get("results", []) if response.status_code == 200 else None
    except (httpx.HTTPError, ValueError):
        results = None
    if results is None:
        return []
    await cache.set(key, LOOKUP_URL, params, results)
    return results


async def author(itunes_id: str) -> str | None:
    results = await lookup({"id": itunes_id, "entity": "podcast"})
    return results[0].get("artistName") if results else None


async def episode_titles(itunes_id: str, limit: int = 50) -> list[str]:
    results = await lookup({"id": itunes_id, "entity": "podcastEpisode", "limit": str(limit)})
    return [r["trackName"] for r in results if r.get("wrapperType") == "podcastEpisode" and r.get("trackName")]
