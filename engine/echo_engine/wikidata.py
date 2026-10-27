import asyncio
import json
from dataclasses import dataclass, field

import httpx

from .cleanup import birth_year, properties
from .qloo_client import cache_key
from .store import Cache, response_cache

SPARQL_URL = "https://query.wikidata.org/sparql"
USER_AGENT = "Echo/0.1 (https://github.com/eleninspl/echo-qloo)"
TTL_SECONDS = 7 * 86400
TIMEOUT_SECONDS = 5
WORK = (
    '{ ?page schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . BIND("page" AS ?kind) '
    "BIND(STR(?page) AS ?value) } "
    + " ".join(
        f'UNION {{ {pattern} . BIND("{kind}" AS ?kind) ?thing wikibase:sitelinks ?links ; rdfs:label ?value . '
        'FILTER(LANG(?value) = "en") }'
        for kind, pattern in (
            ("founded", "?thing wdt:P112 ?item"),
            ("led", "?thing wdt:P169 ?item"),
            ("work", "?item wdt:P800 ?thing"),
        )
    )
)
MIN_SITELINKS = 2
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


def work_queries(people: list[dict]) -> list[str]:
    return [
        f"SELECT DISTINCT ?key ?born ?kind ?value ?links WHERE {{ {block} OPTIONAL {{ ?item wdt:P569 ?born }} {WORK} }}"
        for block in by_ids(people) + by_names(people)
    ]


async def answer(
    client: httpx.AsyncClient, cache: Cache, text: str, size: int, columns: tuple[str, ...]
) -> list[list[str | None]]:
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
    rows = [[(row.get(column) or {}).get("value") for column in columns] for row in bindings if "key" in row]
    await cache.set(key, SPARQL_URL, {"people": str(size)}, rows)
    return rows


async def ask(texts: list[str], size: int, columns: tuple[str, ...]) -> list[list[str | None]]:
    cache = _cache()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"}
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, headers=headers) as client:
        answers = await asyncio.gather(*(answer(client, cache, text, size, columns) for text in texts))
    return [row for rows in answers for row in rows]


async def died(people: list[dict]) -> set[str]:
    texts = queries(people)
    if not texts:
        return set()
    return confirmed(people, await ask(texts, len(people), ("key", "born")))


@dataclass
class Work:
    page: str | None = None
    founded: list[str] = field(default_factory=list)
    led: list[str] = field(default_factory=list)
    works: list[str] = field(default_factory=list)


async def work_of(people: list[dict]) -> dict[str, Work]:
    texts = work_queries(people)
    if not texts:
        return {}
    return works_from(people, await ask(texts, len(people), ("key", "born", "kind", "value", "links")))


def works_from(people: list[dict], rows: list[list[str | None]]) -> dict[str, Work]:
    by_id = {person["entity_id"]: person for person in people}
    named: dict[str, dict[str, list[tuple[int, str]]]] = {}
    pages: dict[str, str] = {}
    for key, born, kind, value, links in rows:
        if key not in by_id or not value or not same_birth(by_id[key], born):
            continue
        if kind == "page":
            pages.setdefault(key, value)
        elif kind in ("founded", "led", "work") and links and links.isdigit() and int(links) >= MIN_SITELINKS:
            named.setdefault(key, {}).setdefault(kind, []).append((int(links), value.strip()))
    found = {}
    for key in pages.keys() | named.keys():
        kinds = named.get(key, {})
        best = {
            kind: [name for _, name in sorted(set(items), key=lambda item: (-item[0], item[1]))]
            for kind, items in kinds.items()
        }
        found[key] = Work(pages.get(key), best.get("founded", []), best.get("led", []), best.get("work", []))
    return found


def confirmed(people: list[dict], rows: list[list[str | None]]) -> set[str]:
    by_id = {person["entity_id"]: person for person in people}
    return {key for key, born in rows if key in by_id and same_birth(by_id[key], born)}
