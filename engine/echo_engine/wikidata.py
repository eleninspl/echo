import asyncio
import json

import httpx

from .cleanup import birth_year, properties
from .qloo_client import cache_key
from .store import Cache, response_cache

SPARQL_URL = "https://query.wikidata.org/sparql"
USER_AGENT = "Echo/0.1 (https://github.com/eleninspl/echo-qloo)"
TTL_SECONDS = 7 * 86400
TIMEOUT_SECONDS = 5
PROPERTIES = {
    "imdb_id": "P345",
    "musicbrainz_artist_id": "P434",
    "library_of_congress_authority_id": "P244",
    "goodreads_author_id": "P2963",
    "spotify_artist_id": "P1902",
}


def _cache() -> Cache:
    return response_cache("wikidata", TTL_SECONDS)


def literal(text: str) -> str:
    return json.dumps(text, ensure_ascii=False)


def by_ids(people: list[dict]) -> list[str]:
    blocks = []
    for key, prop in PROPERTIES.items():
        rows = [
            f"({literal(person['entity_id'])} {literal(str(value['id']))})"
            for person in people
            for value in (person.get("external") or {}).get(key) or []
            if value.get("id")
        ]
        if rows:
            blocks.append(f"{{ VALUES (?key ?id) {{ {' '.join(rows)} }} ?item wdt:{prop} ?id . }}")
    return blocks


def by_names(people: list[dict]) -> list[str]:
    rows = [
        f"({literal(person['entity_id'])} {literal(person['name'].strip())}@en {year})"
        for person in people
        if person.get("name") and (year := birth_year(person)) is not None
    ]
    if not rows:
        return []
    return [
        f"{{ VALUES (?key ?name ?year) {{ {' '.join(rows)} }} "
        "?item rdfs:label ?name ; wdt:P569 ?born . FILTER(YEAR(?born) = ?year) }"
    ]


def queries(people: list[dict]) -> list[str]:
    return [
        f"SELECT DISTINCT ?key ?born WHERE {{ {block} ?item wdt:P570 ?died . OPTIONAL {{ ?item wdt:P569 ?born }} }}"
        for block in by_ids(people) + by_names(people)
    ]


def same_birth(person: dict, born: str | None) -> bool:
    ours = str(properties(person).get("date_of_birth") or "")[:10]
    theirs = (born or "").lstrip("+")[:10]
    if not ours or not theirs:
        return True
    if len(ours) == 10 and not theirs.endswith("-01-01"):
        return ours == theirs
    return ours[:4] == theirs[:4]


async def deaths(client: httpx.AsyncClient, cache: Cache, text: str, size: int) -> list[list[str | None]]:
    key = cache_key(SPARQL_URL, {"query": text})
    if (hit := await cache.get(key)) is not None:
        return hit
    try:
        response = await client.post(SPARQL_URL, data={"query": text})
        bindings = response.json()["results"]["bindings"] if response.status_code == 200 else None
    except (httpx.HTTPError, ValueError, KeyError):
        bindings = None
    if bindings is None:
        return []
    rows = [[row["key"]["value"], (row.get("born") or {}).get("value")] for row in bindings if "key" in row]
    await cache.set(key, SPARQL_URL, {"people": str(size)}, rows)
    return rows


async def died(people: list[dict]) -> set[str]:
    texts = queries(people)
    if not texts:
        return set()
    cache = _cache()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"}
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, headers=headers) as client:
        answers = await asyncio.gather(*(deaths(client, cache, text, len(people)) for text in texts))
    return confirmed(people, [row for rows in answers for row in rows])


def confirmed(people: list[dict], rows: list[list[str | None]]) -> set[str]:
    by_id = {person["entity_id"]: person for person in people}
    return {key for key, born in rows if key in by_id and same_birth(by_id[key], born)}
