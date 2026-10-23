import hashlib

import httpx

SHOW_ID = "11111111-1111-4111-8111-111111111111"
THIN_SHOW_ID = "22222222-2222-4222-8222-222222222222"
ANCHOR_ID = "33333333-3333-4333-8333-333333333333"
WEAK_TOP_SHOW_ID = "44444444-4444-4444-8444-444444444444"
SHOW_TITLE = "Example Show with Sam Host"
ITUNES_ID = "1000000001"
MAP_KINDS = ("artist", "tv_show", "movie", "book", "brand", "podcast")
TAG_SUBTYPE = "urn:tag:keyword:media"
THEME_SUBTYPE = "urn:tag:theme:qloo"


def score(*parts: str) -> float:
    digest = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return round(0.6 + int(digest[:8], 16) / 0xFFFFFFFF * 0.39, 4)


def person_id(i: int) -> str:
    return f"aaaaaaaa-0000-4000-8000-{i:012d}"


def podcast_id(i: int) -> str:
    return f"bbbbbbbb-0000-4000-8000-{i:012d}"


def person(i: int, affinity: float) -> dict:
    entity = {
        "entity_id": person_id(i),
        "name": f"Person {i:02d}",
        "popularity": round(0.3 + (i % 10) * 0.07, 2),
        "properties": {
            "short_descriptions": [{"language": "en", "value": f"Invented person {i}"}],
            "image": {"url": f"https://example.com/p{i}.jpg"},
        },
        "tags": [{"id": "urn:tag:occupation:person:comedian", "name": "Comedian", "type": "urn:tag:occupation:person"}],
        "external": {"imdb_id": [{"id": f"nm{i:07d}"}]},
        "query": {"affinity": affinity},
    }
    if i == 0:
        entity["properties"]["date_of_death"] = "2020-01-01"
    if i == 1:
        entity["name"] = "Sam Host"
    if i == 2:
        entity["properties"]["date_of_birth"] = "2015-05-05"
    if i == 3:
        entity["tags"], entity["external"] = [], {"twitter_username": [{"id": "x"}]}
    if i == 5:
        entity["name"] = "Person 04"
    if i == 6:
        entity["name"] = "Pat Before"
    return entity


def podcast(i: int, affinity: float) -> dict:
    return {"entity_id": podcast_id(i), "name": f"Podcast {i:03d}", "query": {"affinity": affinity}}


def show_entity(entity_id: str) -> dict:
    return {
        "entity_id": entity_id,
        "name": SHOW_TITLE,
        "types": ["urn:entity:podcast"],
        "popularity": 0.9,
        "properties": {
            "short_description": "An invented interview show.",
            "image": {"url": "https://example.com/show.jpg"},
            "external": {"itunes": {"id": ITUNES_ID}},
        },
    }


def tags_for(signal: str, types: str) -> list[dict]:
    """Like Qloo: a person's list of all types is all themes, while a show's has none, so they meet only in the
    show's list of themes."""
    themes = types == THEME_SUBTYPE or signal != SHOW_ID
    subtype = THEME_SUBTYPE if themes else TAG_SUBTYPE
    offset = 0 if signal == SHOW_ID else int(signal[-2:]) % 7
    tags = [
        {
            "tag_id": f"{subtype}:tag_{i}",
            "name": f"{'Theme' if themes else 'Tag'} {i}",
            "subtype": subtype,
            "query": {"affinity": 1},
        }
        for i in range(offset, offset + 30)
    ]
    tags.append({"tag_id": f"{subtype}:religion", "name": "Religion", "subtype": subtype})
    tags.append({"tag_id": "urn:tag:religion:qloo:x", "name": "Something", "subtype": "urn:tag:religion:qloo"})
    return tags


def insights(params: dict[str, str]) -> httpx.Response:
    kind = params["filter.type"]
    signal = params.get("signal.interests.entities", "")
    lens = params.get("filter.results.entities")
    if params.get("signal.location.query") == "Atlantis":
        return httpx.Response(400, json={"error": "signal.location.query is unable to resolve to a valid locality"})
    if params.get("signal.location.query") == "Nowhere" and not lens:
        return httpx.Response(200, json={"results": {"entities": []}})
    if kind == "urn:demographics":
        blocks = [
            {"entity_id": e, "query": {"age": {"24_and_younger": 0.1, "25_to_29": score(e, "age") - 0.4}}}
            for e in signal.split(",")
        ]
        return httpx.Response(200, json={"results": {"demographics": blocks}})
    if kind == "urn:tag":
        return httpx.Response(200, json={"results": {"tags": tags_for(signal, params["filter.tag.types"])}})
    if lens:
        ids = lens.split(",")
        if kind == "urn:entity:podcast" and signal.startswith("aaaaaaaa"):
            query = {} if signal.endswith("9") else {"affinity": score(signal, "love")}
            return httpx.Response(
                200, json={"results": {"entities": [{"entity_id": ids[0], "name": "x", "query": query}]}}
            )
        entities = [{"entity_id": e, "name": e, "query": {"affinity": score(signal, e)}} for e in ids]
        return httpx.Response(200, json={"results": {"entities": entities}})
    if kind == "urn:entity:person":
        if signal.startswith(THIN_SHOW_ID):
            return httpx.Response(200, json={"results": {"entities": [person(i, 0.9) for i in range(10, 15)]}})
        start = 20 if "filter.popularity.max" in params else 0
        if ANCHOR_ID in signal:
            start = 40
        if signal.startswith(WEAK_TOP_SHOW_ID) and "filter.popularity.max" not in params:
            start = 9  # Person 09's love back lens has no affinity
        people = [person(i, round(0.95 - (i - start) * 0.002, 4)) for i in range(start, start + 50)]
        return httpx.Response(200, json={"results": {"entities": people}})
    if kind == "urn:entity:podcast" and signal.startswith("aaaaaaaa"):
        i = int(signal[-12:])
        if i == 7:
            return httpx.Response(400, json={"error": "All of the provided signal.interests.entities were invalid"})
        podcasts = [podcast(100 + i + j, 0.9) for j in range(50)]
        if i % 2 == 0:
            podcasts.insert(3, {"entity_id": SHOW_ID, "name": SHOW_TITLE, "query": {"affinity": score(signal, "love")}})
        return httpx.Response(200, json={"results": {"entities": podcasts[:50]}})
    items = [
        {"entity_id": f"{kind}-{signal[:4]}-{i}", "name": f"{kind} {i}", "query": {"affinity": 0.9}} for i in range(20)
    ]
    return httpx.Response(200, json={"results": {"entities": items}})


def handler(request: httpx.Request) -> httpx.Response:
    params = dict(request.url.params)
    if request.url.path == "/search":
        if params.get("types") == "urn:entity:podcast":
            return httpx.Response(200, json={"results": [show_entity(SHOW_ID)]})
        return httpx.Response(200, json={"results": [{"entity_id": ANCHOR_ID, "name": "Example Film"}]})
    if request.url.path == "/entities":
        ids = params["entity_ids"].upper().split(",")
        if ids[0] in (SHOW_ID.upper(), THIN_SHOW_ID.upper(), WEAK_TOP_SHOW_ID.upper()):
            return httpx.Response(200, json={"results": [show_entity(ids[0].lower())]})
        return httpx.Response(400, json={"error": "entity_ids should be an array of valid UUIDs"})
    if request.url.path == "/v2/insights":
        return insights(params)
    return httpx.Response(404)
