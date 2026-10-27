import html
import re

import httpx

from .qloo_client import cache_key
from .store import Cache, response_cache

LOOKUP_URL = "https://itunes.apple.com/lookup"
TTL_SECONDS = 7 * 86400
FEED_BYTES = 30_000_000
ITEM = re.compile(r"<item\b.*?</item>", re.DOTALL | re.IGNORECASE)
TITLE = re.compile(r"<title>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</title>", re.DOTALL | re.IGNORECASE)


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


async def feed_url(itunes_id: str) -> str | None:
    results = await lookup({"id": itunes_id, "entity": "podcast"})
    url = results[0].get("feedUrl") if results else None
    return url if isinstance(url, str) and url.startswith(("https://", "http://")) else None


async def download(url: str) -> str | None:
    chunks: list[bytes] = []
    size = 0
    try:
        async with (
            httpx.AsyncClient(timeout=10, follow_redirects=True) as client,
            client.stream("GET", url) as response,
        ):
            if response.status_code != 200:
                return None
            async for chunk in response.aiter_bytes():
                size += len(chunk)
                if size > FEED_BYTES:
                    break
                chunks.append(chunk)
    except httpx.HTTPError:
        return None
    return b"".join(chunks).decode("utf-8", errors="replace")


def item_titles(feed: str) -> list[str]:
    titles = []
    for item in ITEM.finditer(feed):
        if (title := TITLE.search(item.group(0))) and (text := " ".join(html.unescape(title.group(1)).split())):
            titles.append(text)
    return titles


async def feed_titles(itunes_id: str) -> list[str]:
    url = await feed_url(itunes_id)
    if url is None:
        return []
    cache = _cache()
    key = cache_key(url, {})
    if (hit := await cache.get(key)) is not None:
        return hit
    if (feed := await download(url)) is None:
        return []
    titles = item_titles(feed)
    await cache.set(key, url, {}, titles)
    return titles
