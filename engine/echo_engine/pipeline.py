import asyncio
import logging
import math
import re
from collections import Counter
from collections.abc import Awaitable, Callable, Collection, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from difflib import SequenceMatcher
from itertools import zip_longest
from statistics import fmean
from typing import Any, get_args

from . import apple, llm, scoring, wikidata
from .cleanup import (
    dedupe,
    host_matcher,
    is_dead,
    is_minor,
    is_public_figure,
    normalize,
    person_description,
    properties,
)
from .models import (
    AgeBucket,
    Analysis,
    AnchorType,
    BridgeCount,
    EpisodeAbout,
    Evidence,
    Filters,
    Guest,
    GuestBridge,
    GuestMaps,
    LeftOut,
    MapItem,
    MapRow,
    Person,
    Scores,
    Show,
    TasteAsk,
    TasteFan,
    TasteFans,
)
from .qloo_client import QlooClient, QlooError
from .screen import TAG_TYPES, THEME_TAGS, clean_entity, clean_fact, clean_name, clean_person, clean_tag_name

log = logging.getLogger("echo.pipeline")

PERSON = "urn:entity:person"
PODCAST = "urn:entity:podcast"
MAP_TYPES = [
    ("music", "artist"),
    ("tv", "tv_show"),
    ("film", "movie"),
    ("books", "book"),
    ("brands", "brand"),
    ("podcasts", "podcast"),
]
SEARCH_FILLER = frozenset({"a", "an", "and", "by", "for", "in", "of", "on", "podcast", "show", "the", "this", "with"})
TYPO_RATIO = 0.8
MAP_TAKE = 20
MAP_SHOWN = 8
MAP_SCREENED = 1 / 2
LIST_TAKE = 50
POOL_SIZE = 20
EXPLAINED = 10
MAX_REFILLS = 5
MIN_LIVING = 10
MIN_SCORED = 5
# Each guest's top podcasts for reach and new podcasts: at least this many, more when they fit (reach_width).
REACH_PODCASTS = 10
CHUNK = 50
FAME_CAP = {"any": None, "less_famous": 0.6, "rising": 0.4}
SECOND_LIST_CAP = 0.7
AGE_DELTA = 0.2
SHARED_SHOWN = 5
SHARED_PODCASTS = 2
STRONGEST_PODCASTS = 10
# Shared tastes leave out the tags more than half the top guests have, and the podcasts more than a third of them
# have: they say nothing about one guest.
COMMON_TAGS = 1 / 2
COMMON_PODCASTS = 1 / 3
COMMON_FALLBACK = 2
# A podcast both audiences love: the show's affinity for it is in the top half of its affinities for every
# guest's podcasts.
LOVED_QUANTILE = 0.5
NEW_PODCASTS_SHOWN = 3
EPISODE_TITLES = 200
# Trailers and cross-promotions name people who weren't guests ("INTRODUCING: Another Show with Ann Example").
PROMO_TITLE = re.compile(r"^\W*(introducing|trailer|preview|sneak peek|coming soon)\b", re.IGNORECASE)
TITLE_BREAK = re.compile(r"[:|()\[\]–—]|\s-\s")
HONORIFIC = re.compile(r"^(?:dr|prof|professor) ")
GUEST_AFTER = {"on", "of", "returns"}
GUEST_BEFORE = {"with", "featuring", "feat", "ft", "w"}
AGE_ORDER = list(get_args(AgeBucket))
LINKS = {
    "imdb": ("imdb_id", "https://www.imdb.com/name/{}/"),
    "spotify": ("spotify_artist_id", "https://open.spotify.com/artist/{}"),
    "musicbrainz": ("musicbrainz_artist_id", "https://musicbrainz.org/artist/{}"),
}
WEBSITE = re.compile(r"^https?://[^\s/?#]+\.[^\s]+$", re.IGNORECASE)
WIKIPEDIA = re.compile(r"^https://en\.wikipedia\.org/wiki/\S+$")
# The bio: the description, then up to this many fact sentences. A listed name longer than this is left out.
BIO_FACTS = 3
BIO_NAME_LENGTH = 80
# Instruments that only say the person sings, and a birth year in the description ("Ann Example (born 1970)").
NOT_INSTRUMENTS = frozenset({"voice", "vocals", "singing"})
BORN = re.compile(r"\s*\((?:born|b\.)[^)]*\)", re.IGNORECASE)
BUSINESS_ROLE = re.compile(
    r"\b(?:business(?:man|woman|person)|entrepreneur|investor|venture.capitalist|executive|founder|ceo)\b",
    re.IGNORECASE,
)

VERSION = 2
DATED: frozenset[AnchorType] = frozenset({"movie", "tv_show", "videogame"})
STEPS = [
    ("map", "Mapping your audience"),
    ("candidates", "Finding guests"),
    ("clean", "Removing hosts and past guests"),
    ("score", "Scoring love back and reach"),
    ("evidence", "Collecting the evidence"),
    ("ideas", "Writing episode ideas"),
]


class ShowNotFound(LookupError):
    pass


class AnalysisFailed(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class LoveBack:
    love: float | None
    rank: int | None
    podcasts: list[str]  # the guest's podcast list without the show, best first
    names: dict[str, str] = field(default_factory=dict)


@dataclass
class Scored:
    person: dict
    love: LoveBack
    fit_raw: float = 0.0
    reach_raw: float | None = None
    fit_pct: float = 0.0
    love_pct: float = 0.0
    reach_pct: float | None = None
    anchor_raw: float | None = None
    echo: float = 0.0


def english(descriptions: list[dict] | None) -> str | None:
    for item in descriptions or []:
        if item.get("language") == "en" and item.get("value"):
            return item["value"]
    return None


def image_of(entity: dict) -> str | None:
    return (properties(entity).get("image") or {}).get("url")


def affinity(entity: dict) -> float | None:
    return (entity.get("query") or {}).get("affinity")


def entities_of(data: dict) -> list[dict]:
    return (data.get("results") or {}).get("entities") or []


def is_rejected_input(error: QlooError) -> bool:
    return error.status == 400 and "invalid" in error.body.lower()


def show_from(entity: dict) -> Show:
    props = properties(entity)
    return Show(
        id=entity["entity_id"],
        title=entity["name"],
        description=props.get("short_description") or english(props.get("short_descriptions")),
        image_url=image_of(entity),
    )


def itunes_id_of(entity: dict) -> str | None:
    return ((properties(entity).get("external") or {}).get("itunes") or {}).get("id")


def word_found(word: str, words: set[str], joined: str) -> bool:
    if word in words:
        return True
    if len(word) >= 4 and (word in joined or any(other.startswith(word) for other in words)):
        return True
    return len(word) >= 5 and any(SequenceMatcher(None, word, other).ratio() >= TYPO_RATIO for other in words)


def matches_search(show: Show, q: str) -> bool:
    wanted = [word for word in normalize(q).split() if word not in SEARCH_FILLER]
    text = normalize(f"{show.title} {show.description or ''}")
    words = set(text.split())
    return not wanted or any(word_found(word, words, text.replace(" ", "")) for word in wanted)


async def search_shows(client: QlooClient, q: str) -> list[Show]:
    results = await client.search(q, types=PODCAST, take=5)
    return [show for show in (show_from(result) for result in results) if matches_search(show, q)]


async def get_show(client: QlooClient, show_id: str) -> Show:
    found = await show_entity(client, show_id)
    return show_from(found)


async def show_entity(client: QlooClient, show_id: str) -> dict:
    try:
        found = await client.entities([show_id])
    except QlooError as error:
        if error.status in (400, 404):
            raise ShowNotFound(show_id) from error
        raise
    podcasts = [entity for entity in found if PODCAST in (entity.get("types") or [PODCAST])]
    if not podcasts:
        raise ShowNotFound(show_id)
    return podcasts[0]


async def map_lists(
    client: QlooClient, entity_id: str, leave_out: str | None = None, signals: dict[str, str] | None = None
) -> dict[str, list[MapItem]]:
    """The audience map of `entity_id`, without itself and without `leave_out` (the show, on a guest's map)."""
    skip = {entity_id.upper(), (leave_out or "").upper()}

    async def one(kind: str) -> list[MapItem]:
        try:
            data = await client.insights(
                {
                    "filter.type": f"urn:entity:{kind}",
                    "signal.interests.entities": entity_id,
                    "take": MAP_TAKE,
                    **(signals or {}),
                }
            )
        except QlooError as error:
            if error.status == 400 and "locality" in error.body.lower():
                raise AnalysisFailed("unknown_country", "Echo doesn't recognise that country.") from error
            if error.status == 400:
                return []
            raise
        listed = [e for e in entities_of(data) if (e.get("entity_id") or "").upper() not in skip]
        kept = [e for e in listed if clean_entity(e)]
        if len(listed) - len(kept) > len(listed) * MAP_SCREENED:
            return []
        return [
            MapItem(
                name=e["name"].strip(),
                image_url=image_of(e),
                affinity=round(affinity(e) or 0.0, 3),
                id=e.get("entity_id"),
            )
            for e in kept
        ]

    lists = await asyncio.gather(*(one(kind) for _, kind in MAP_TYPES))
    return {category: items for (category, _), items in zip(MAP_TYPES, lists, strict=True)}


def rows_of(lists: dict[str, list[MapItem]]) -> list[MapRow]:
    return [MapRow(category=category, items=items[:MAP_SHOWN]) for category, items in lists.items() if items]


async def resolve_anchor(client: QlooClient, about: EpisodeAbout) -> dict | None:
    results = await client.search(about.query, types=f"urn:entity:{about.type}", take=1)
    return results[0] if results else None


def anchor_name(anchor: dict, kind: AnchorType) -> str:
    name = " ".join(anchor["name"].split())
    year = str(properties(anchor).get("release_year") or "")[:4] if kind in DATED else ""
    return f"{name} ({year})" if year.isdigit() and year not in name else name


def list_params(show_id: str, filters: Filters) -> dict[str, Any]:
    params: dict[str, Any] = {"filter.type": PERSON, "signal.interests.entities": show_id, "take": LIST_TAKE}
    if filters.age:
        params["signal.demographics.age"] = filters.age
    if filters.country:
        params["signal.location.query"] = filters.country
    if (cap := FAME_CAP[filters.fame]) is not None:
        params["filter.popularity.max"] = cap
    return params


async def person_list(client: QlooClient, params: dict[str, Any]) -> list[dict]:
    try:
        return entities_of(await client.insights(params))
    except QlooError as error:
        if error.status == 400 and "locality" in error.body.lower():
            raise AnalysisFailed("unknown_country", "Echo doesn't recognise that country.") from error
        if error.status == 400:
            raise AnalysisFailed("show_unusable", "Echo can't analyse this show yet.") from error
        raise


async def ready[T](value: T) -> T:
    return value


async def candidate_lists(
    client: QlooClient, show_id: str, filters: Filters, anchor_id: str | None
) -> tuple[list[dict], list[dict], list[dict]]:
    first = list_params(show_id, filters)
    second = {**first, "filter.popularity.max": SECOND_LIST_CAP} if filters.fame == "any" else None
    third = {**first, "signal.interests.entities": f"{show_id},{anchor_id}"} if anchor_id else None
    c1, c2, c3 = await asyncio.gather(
        person_list(client, first),
        person_list(client, second) if second else ready([]),
        person_list(client, third) if third else ready([]),
    )
    if c3 and [p["entity_id"] for p in c3] == [p["entity_id"] for p in c1]:
        c3 = []
    return c1, c2, c3


def merge(c1: list[dict], c2: list[dict], c3: list[dict]) -> list[dict]:
    seen: set[str] = set()
    order: list[dict] = []

    def add(person: dict | None) -> None:
        if person and person["entity_id"] not in seen:
            seen.add(person["entity_id"])
            order.append(person)

    for person in c3[: POOL_SIZE // 2]:
        add(person)
    for a, b in zip_longest(c1, c2):
        add(a)
        add(b)
    for person in c3[POOL_SIZE // 2 :]:
        add(person)
    return order


async def love_back(client: QlooClient, guest_id: str, show_id: str) -> LoveBack | None:
    try:
        data = await client.insights({"filter.type": PODCAST, "signal.interests.entities": guest_id, "take": LIST_TAKE})
    except QlooError as error:
        if is_rejected_input(error):
            return None
        raise
    podcasts = entities_of(data)
    ids = [p["entity_id"] for p in podcasts]
    names = {p["entity_id"]: p["name"] for p in podcasts if clean_entity(p)}
    others = [i for i in ids if i != show_id]
    if show_id in ids:
        index = ids.index(show_id)
        return LoveBack(affinity(podcasts[index]), index + 1, others, names)
    lens = await client.insights(
        {
            "filter.type": PODCAST,
            "signal.interests.entities": guest_id,
            "filter.results.entities": show_id,
            "take": LIST_TAKE,
        }
    )
    score = next((affinity(e) for e in entities_of(lens) if e["entity_id"] == show_id), None)
    return LoveBack(score, None, others, names)


async def lens(client: QlooClient, base: dict[str, Any], ids: Sequence[str]) -> dict[str, float]:
    ordered = sorted(set(ids))
    batches = [ordered[i : i + CHUNK] for i in range(0, len(ordered), CHUNK)]
    results = await asyncio.gather(
        *(client.insights({**base, "filter.results.entities": ",".join(batch), "take": LIST_TAKE}) for batch in batches)
    )
    scores: dict[str, float] = {}
    for data in results:
        for entity in entities_of(data):
            if (value := affinity(entity)) is not None:
                scores[entity["entity_id"]] = value
    return scores


async def usable(client: QlooClient, show_id: str, plain: list[dict]) -> None:
    living = [p for p in plain if not is_dead(p)]
    if len(living) < MIN_LIVING:
        raise AnalysisFailed("show_unusable", "Echo can't analyse this show yet: too little data on its audience.")
    for person in living[:3]:
        result = await love_back(client, person["entity_id"], show_id)
        if result is not None and result.love is not None:
            return
    raise AnalysisFailed("show_unusable", "Echo can't analyse this show yet: it can't score love back for it.")


async def optional(work: Awaitable[Any], fallback: Any) -> Any:
    """Best effort, for Apple: any failure gives the fallback."""
    try:
        return await work
    except Exception:
        log.exception("optional step failed")
        return fallback


async def llm_step(work: Awaitable[Any], fallback: Any, what: str) -> Any:
    """An LLM call: a stub that isn't built gives the fallback, any other failure is an llm_error."""
    try:
        return await work
    except NotImplementedError:
        return fallback
    except Exception as error:
        log.exception("LLM step failed: %s", what)
        raise AnalysisFailed("llm_error", f"Echo couldn't write {what}. Try again in a minute.") from error


async def episode_titles(itunes_id: str | None) -> tuple[list[str], list[str]]:
    if not itunes_id:
        return [], []
    recent, every = await asyncio.gather(
        optional(apple.episode_titles(itunes_id, EPISODE_TITLES), []), optional(apple.feed_titles(itunes_id), [])
    )
    seen = set(recent)
    return recent, [title for title in every if title not in seen]


async def author_of(itunes_id: str | None) -> str | None:
    return await optional(apple.author(itunes_id), None) if itunes_id else None


def title_parts(title: str) -> list[str]:
    parts = (HONORIFIC.sub("", normalize(part)) for part in TITLE_BREAK.split(title))
    return [part for part in parts if part]


def names_as_guest(parts: list[str], name: str) -> bool:
    for part in parts:
        if part == name:
            return True
        if part.startswith(f"{name} ") and part[len(name) + 1 :].split()[0] in GUEST_AFTER:
            return True
        before = part.removesuffix(f" {name}")
        if before != part and before.split()[-1] in GUEST_BEFORE:
            return True
    return False


def past_guest_ids(episode_titles: list[str], pool: list[dict], older_titles: Sequence[str] = ()) -> set[str]:
    titles = [f" {normalize(title)} " for title in episode_titles if not PROMO_TITLE.match(title)]
    older = [title_parts(title) for title in older_titles if not PROMO_TITLE.match(title)]
    found = set()
    for person in pool:
        name = normalize(person["name"])
        if len(name.split()) < 2:
            continue
        bare = HONORIFIC.sub("", name)
        if any(f" {name} " in title for title in titles) or any(names_as_guest(parts, bare) for parts in older):
            found.add(person["entity_id"])
    return found


def links_of(person: dict) -> dict[str, str]:
    external = person.get("external") or {}
    links = {}
    for name, (key, template) in LINKS.items():
        values = external.get(key) or []
        if values and values[0].get("id"):
            links[name] = template.format(values[0]["id"])
    sites = properties(person).get("official_website") or []
    site = sites[0].strip() if sites and isinstance(sites[0], str) else ""
    if WEBSITE.match(site):
        links["website"] = site
    return links


def fact_names(person: dict, key: str, most: int, skip: frozenset[str] = frozenset()) -> list[str]:
    return screened_names(person, properties(person).get(key), most, skip)


def screened_names(person: dict, values: Any, most: int, skip: frozenset[str] = frozenset()) -> list[str]:
    if not isinstance(values, list):
        return []
    own = normalize(person.get("name") or "")
    names: list[str] = []
    for value in values:
        name = " ".join(value.split()) if isinstance(value, str) else ""
        if not name or len(name) > BIO_NAME_LENGTH or not clean_fact(name) or normalize(name) in skip | {own}:
            continue
        if normalize(name) not in {normalize(n) for n in names}:
            names.append(name)
        if len(names) == most:
            break
    return names


def joined(names: list[str]) -> str:
    return names[0] if len(names) == 1 else f"{', '.join(names[:-1])} and {names[-1]}"


def sentence(text: str) -> str:
    text = " ".join(text.split()).rstrip(" .")
    return f"{text[0].upper()}{text[1:]}." if text else ""


def since_year(person: dict, today: datetime) -> int | None:
    match = re.match(r"(\d{4})-", str(properties(person).get("work_period_start") or ""))
    year = int(match.group(1)) if match else None
    return year if year and 1900 <= year <= today.year else None


def known_facts(
    person: dict, today: datetime | None = None, description: str | None = None, work: wikidata.Work | None = None
) -> list[str]:
    """Public, work-only facts about a person as plain sentences, best first. Never gender, birth date,
    citizenship, family, partners, lifestyle or political office: only the keys read here, and from Wikidata
    only what they founded, ran and are known for."""
    work = work or wikidata.Work()
    founded = screened_names(person, work.founded, 3)
    led = screened_names(person, work.led, 2)
    works = screened_names(person, fact_names(person, "notable_work", 3) + work.works, 3)
    awards = fact_names(person, "award_received", 2)
    nominations = [] if awards else fact_names(person, "nominated_for", 2)
    employers = [] if founded or led else fact_names(person, "employer", 2)
    if len(employers) == 1 and BUSINESS_ROLE.search(description or ""):
        employers = []
    teams = [] if employers else fact_names(person, "member_of_sports_team", 3)
    instruments = [name.removesuffix(" instrument") for name in fact_names(person, "instrument", 2, NOT_INSTRUMENTS)]
    year = since_year(person, today or datetime.now(UTC))
    facts = [
        founded and f"A founder of {joined(founded)}.",
        led and f"Has been chief executive of {joined(led)}.",
        works and f"Known for {joined(works)}.",
        awards and f"Received {joined(awards)}.",
        nominations and f"Nominated for {joined(nominations)}.",
        employers and f"Has worked for {joined(employers)}.",
        teams and f"Has played for {joined(teams)}.",
        year and f"Active since {year}.",
        instruments and f"Plays {joined(instruments)}.",
    ]
    return [re.sub(r"\.{2,}$", ".", fact) for fact in facts if fact][:BIO_FACTS]


def bio_of(
    person: dict, description: str | None, today: datetime | None = None, work: wikidata.Work | None = None
) -> str | None:
    facts = known_facts(person, today, description, work)
    if not facts:
        return None
    return " ".join(part for part in [sentence(BORN.sub("", description or "")), *facts] if part)


def score(scored: list[Scored]) -> list[Scored]:
    popularity = [p.person.get("popularity") for p in scored]
    known = [p for p in popularity if p is not None]
    mean_popularity = fmean(known) if known else 0.5
    popularity = [mean_popularity if p is None else p for p in popularity]
    adjusted = scoring.fame_adjusted([s.fit_raw for s in scored], popularity)
    fit_pct = scoring.percentiles(adjusted)
    love_pct = scoring.percentiles([s.love.love for s in scored])
    reach_pct = scoring.percentiles([s.reach_raw for s in scored])
    anchored = any(s.anchor_raw is not None for s in scored)
    anchor_pct = scoring.percentiles([s.anchor_raw if s.anchor_raw is not None else 0.0 for s in scored])
    for item, f, lv, r, a in zip(scored, fit_pct, love_pct, reach_pct, anchor_pct, strict=True):
        item.fit_pct, item.love_pct, item.reach_pct = f or 0.0, lv or 0.0, r
        item.echo = scoring.echo_score(item.fit_pct, item.love_pct, r, a if anchored else None)
    return sorted(
        scored,
        key=lambda s: (-s.echo, -(s.love.love or 0), s.person.get("popularity") or 1, s.person["entity_id"]),
    )


def guest_description(person: dict) -> str | None:
    """Qloo's one-line description, screened like the bio's facts: one that names who the person is (their
    identity, beliefs or health) is left out rather than shown."""
    description = person_description(person)
    return description if description and clean_fact(description) else None


def guest_of(item: Scored, ref: str) -> Guest:
    description = guest_description(item.person)
    return Guest(
        ref=ref,
        id=item.person["entity_id"],
        name=item.person["name"],
        description=description,
        bio=bio_of(item.person, description),
        image_url=image_of(item.person),
        links=links_of(item.person),
        label=scoring.label(item.fit_pct, item.love_pct, item.reach_pct),
        scores=Scores(
            fit=round(item.fit_pct, 3),
            love_back=round(item.love_pct, 3),
            reach=None if item.reach_pct is None else round(item.reach_pct, 3),
            echo=round(item.echo, 3),
        ),
    )


async def tags_of(client: QlooClient, entity_id: str, types: Sequence[str] = TAG_TYPES) -> list[dict]:
    try:
        data = await client.insights(
            {
                "filter.type": "urn:tag",
                "signal.interests.entities": entity_id,
                "filter.tag.types": ",".join(types),
                "take": LIST_TAKE,
            }
        )
    except QlooError as error:
        if error.status == 400:
            return []
        raise
    tags = (data.get("results") or {}).get("tags") or []
    return [t for t in tags if t.get("subtype") in types and clean_tag_name(t.get("name", ""))]


async def show_tag_ranks(client: QlooClient, show_id: str) -> dict[str, int]:
    """Each tag's best rank in the show's list of all allowed types and in its list of themes. A person's list is
    often all themes while a show's has few, so without the second list they would barely meet."""
    lists = await asyncio.gather(tags_of(client, show_id), tags_of(client, show_id, [THEME_TAGS]))
    ranks: dict[str, int] = {}
    for tags in lists:
        for rank, tag in enumerate(tags):
            ranks[tag["tag_id"]] = min(rank, ranks.get(tag["tag_id"], rank))
    return ranks


def tag_key(tag: dict) -> str:
    """Tags are counted by name: a keyword and a theme can have the same one (humor and Humor)."""
    return normalize(tag["name"])


def shared_tags(
    show_ranks: dict[str, int], guest_tags: list[dict], tag_guests: Counter[str], compared: int
) -> list[str]:
    """Tags in both lists, without those most of the `compared` guests have. Stronger and rarer first: the sum of
    the two ranks times the number of guests with the tag, so a tag only this guest has beats a broad one. A guest
    with only common tags keeps the strongest two, rather than none."""
    both = [
        (show_ranks[tag["tag_id"]] + rank + 1, tag)
        for rank, tag in enumerate(guest_tags)
        if tag["tag_id"] in show_ranks
    ]
    specific = sorted(
        (ranks * max(tag_guests[tag_key(tag)], 1), ranks, tag["name"].strip())
        for ranks, tag in both
        if tag_guests[tag_key(tag)] <= compared * COMMON_TAGS
    )
    if specific:
        return [name for _, _, name in specific]
    return [tag["name"].strip() for _, tag in sorted(both, key=lambda pair: pair[0])][:COMMON_FALLBACK]


def loved_threshold(reach_scores: dict[str, float]) -> float:
    values = sorted(reach_scores.values())
    return values[int(len(values) * LOVED_QUANTILE)] if values else math.inf


def shared_podcasts(
    love: LoveBack,
    width: int,
    reach_scores: dict[str, float],
    shared_by: Counter[str],
    compared: int,
    shown: Collection[str] = (),
) -> list[str]:
    """IDs of the guest's podcasts that the show's listeners love too, the ones fewest other guests have first,
    then the show's strongest. Those most guests have are left out, unless that leaves fewer than two: then the
    guest's own strongest loved podcasts fill in, first those not `shown` on another guest's card."""
    threshold = loved_threshold(reach_scores)
    loved = [
        p
        for p in love.podcasts[:width]
        if reach_scores.get(p, -math.inf) >= threshold and clean_name(love.names.get(p, ""))
    ]
    rare = sorted((shared_by[p], -reach_scores[p], p) for p in loved if shared_by[p] <= compared * COMMON_PODCASTS)
    ids = [p for _, _, p in rare][:SHARED_PODCASTS]
    strongest = [p for p in loved[:STRONGEST_PODCASTS] if p not in ids]
    fill = [p for p in strongest if p not in shown] + [p for p in strongest if p in shown]
    return ids + fill[: SHARED_PODCASTS - len(ids)]


def tag_label(name: str) -> str:
    return (
        name if any(ch.isupper() for ch in name) else " ".join(word[:1].upper() + word[1:] for word in name.split(" "))
    )


def shared_tastes(podcasts: list[str], tags: list[str]) -> list[str]:
    """Named podcasts both audiences love, then shared tags, without repeats."""
    names: list[str] = list(dict.fromkeys(podcasts))
    tag_words: list[set[str]] = []
    for tag in tags:
        words = set(normalize(tag).split())
        if not words or normalize(tag) in {normalize(name) for name in names}:
            continue
        if any(words <= other or other <= words for other in tag_words):
            continue
        tag_words.append(words)
        names.append(tag_label(tag.strip()))
    return names[:SHARED_SHOWN]


async def age_profiles(client: QlooClient, ids: list[str]) -> dict[str, dict[str, float]]:
    data = await client.insights({"filter.type": "urn:demographics", "signal.interests.entities": ",".join(ids)})
    blocks = (data.get("results") or {}).get("demographics") or []
    return {block["entity_id"]: (block.get("query") or {}).get("age") or {} for block in blocks}


def over_index(guest_age: dict[str, float], show_age: dict[str, float]) -> list[str]:
    if not guest_age:
        return []
    deltas = {b: v - show_age.get(b, 0.0) for b, v in guest_age.items()} if show_age else dict(guest_age)
    top = sorted((v, b) for b, v in deltas.items() if v > AGE_DELTA and b in AGE_ORDER)[-2:]
    return sorted((b for _, b in top), key=AGE_ORDER.index)


def reach_width(lists: Sequence[Sequence[str]]) -> int:
    """How many of each guest's podcasts reach and new podcasts use: REACH_PODCASTS, or more while the reach lens
    needs no more calls. On a show whose guests' fans share their top podcasts, the guests differ further down."""

    def calls(width: int) -> int:
        return math.ceil(len({p for podcasts in lists for p in podcasts[:width]}) / CHUNK)

    longest = max((len(podcasts) for podcasts in lists), default=0)
    width = REACH_PODCASTS
    while width < longest and calls(width + 1) <= calls(REACH_PODCASTS):
        width += 1
    return width


def new_podcasts(
    love: LoveBack, width: int, reach_scores: dict[str, float], shared_by: Counter[str], shown: Sequence[str] = ()
) -> list[str]:
    """The guest's podcasts that fewest other guests have, then the ones the show's audience over-indexes on least.
    Those `shown` as shared tastes are left out."""
    scored = sorted(
        (shared_by[p], reach_scores[p], p) for p in love.podcasts[:width] if p in reach_scores and p not in shown
    )
    names = [love.names.get(p, "") for _, _, p in scored]
    return [name for name in names if clean_name(name)][:NEW_PODCASTS_SHOWN]


def first_error(error: BaseException) -> BaseException:
    while isinstance(error, BaseExceptionGroup):
        error = error.exceptions[0]
    return error


Progress = Callable[[], Awaitable[None]]


async def run_analysis(client: QlooClient, analysis: Analysis, progress: Progress | None = None) -> None:
    """Fills `analysis` step by step. `progress` is awaited after each step, so the caller can save it."""
    steps = {step.key: step for step in analysis.steps}

    async def done(key: str) -> None:
        steps[key].done = True
        if progress:
            await progress()

    entity = await show_entity(client, analysis.show.id)

    async def fill_map() -> None:
        analysis.audience_map = rows_of(await map_lists(client, analysis.show.id))
        await done("map")

    try:
        async with asyncio.TaskGroup() as group:
            group.create_task(fill_map())
            group.create_task(fill_guests(client, analysis, done, itunes_id_of(entity)))
    except BaseExceptionGroup as error:
        raise first_error(error) from None

    if "ideas" not in steps:
        return
    ideas, mixed_up = await llm_step(llm.write_ideas(analysis), ({}, set()), "the episode ideas")
    for guest in analysis.guests:
        guest.idea = ideas.get(guest.ref)
        if guest.ref in mixed_up:
            guest.description = guest.bio = None
    await done("ideas")


async def people_lists(
    client: QlooClient, show_id: str, filters: Filters
) -> tuple[dict | None, tuple[list[dict], list[dict], list[dict]]]:
    anchor = await resolve_anchor(client, filters.episode_about) if filters.episode_about else None
    plain_params = {"filter.type": PERSON, "signal.interests.entities": show_id, "take": LIST_TAKE}
    filtered = list_params(show_id, filters) != plain_params
    plain, lists = await asyncio.gather(
        person_list(client, plain_params) if filtered else ready([]),
        candidate_lists(client, show_id, filters, anchor["entity_id"] if anchor else None),
    )
    await usable(client, show_id, plain if filtered else lists[0])
    return anchor, lists


async def fill_guests(
    client: QlooClient, analysis: Analysis, done: Callable[[str], Awaitable[None]], itunes_id: str | None
) -> None:
    show, filters = analysis.show, analysis.filters
    (anchor, (c1, c2, c3)), author, (titles, older_titles) = await asyncio.gather(
        people_lists(client, show.id, filters), author_of(itunes_id), episode_titles(itunes_id)
    )
    if filters.episode_about:
        filters.episode_about.used = anchor_name(anchor, filters.episode_about.type) if anchor and c3 else None
    await done("candidates")

    today = datetime.now(UTC).date()
    excluded = set(filters.exclude)

    def keep(person: dict) -> bool:
        if person["entity_id"] in excluded:
            return False
        return not is_dead(person) and not is_minor(person, today) and is_public_figure(person) and clean_person(person)

    pool = merge([p for p in c1 if keep(p)], [p for p in c2 if keep(p)], [p for p in c3 if keep(p)])
    is_host = host_matcher(show.title, author, show.description)
    people = [
        Person(id=p["entity_id"], name=p["name"], description=person_description(p)) for p in pool[: POOL_SIZE * 2]
    ]
    past = past_guest_ids(titles, pool, older_titles)
    kept, left_out = [], []
    for person in pool:
        if is_host(person["name"]):
            left_out.append(LeftOut(name=person["name"], why="host"))
        elif person["entity_id"] in past:
            left_out.append(LeftOut(name=person["name"], why="past_guest"))
        else:
            kept.append(person)
    kept = dedupe(kept, lambda person: affinity(person) or 0.0)
    narrowed = bool(filters.age or filters.country or filters.fame != "any")
    if len(kept) < MIN_SCORED and narrowed:
        raise AnalysisFailed("filters_too_narrow", "No guests match those filters. Try a broader one.")
    selected, reserve = kept[:POOL_SIZE], kept[POOL_SIZE:]

    async def loves_of(batch: list[dict]) -> list[LoveBack | None]:
        return await asyncio.gather(*(love_back(client, p["entity_id"], show.id) for p in batch))

    async with asyncio.TaskGroup() as group:
        hosts = group.create_task(llm_step(llm.find_hosts(show, people), set(), "the host check"))
        dead = group.create_task(optional(wikidata.died(pool[: POOL_SIZE * 2]), set()))
        loves = group.create_task(loves_of(selected))
    llm_hosts = hosts.result()
    gone = llm_hosts | dead.result()
    analysis.left_out = left_out + [LeftOut(name=p["name"], why="host") for p in kept if p["entity_id"] in llm_hosts]
    if len([p for p in kept if p["entity_id"] not in gone]) < MIN_SCORED and narrowed:
        raise AnalysisFailed("filters_too_narrow", "No guests match those filters. Try a broader one.")
    await done("clean")

    scored = [
        Scored(p, lb)
        for p, lb in zip(selected, loves.result(), strict=True)
        if lb and lb.love is not None and p["entity_id"] not in gone
    ]
    reserve = [p for p in reserve if p["entity_id"] not in gone]
    refills = 0
    while len(scored) < POOL_SIZE and reserve and refills < MAX_REFILLS:
        batch = [reserve.pop(0) for _ in range(min(POOL_SIZE - len(scored), MAX_REFILLS - refills, len(reserve)))]
        refills += len(batch)
        results = await loves_of(batch)
        scored += [Scored(p, lb) for p, lb in zip(batch, results, strict=True) if lb and lb.love is not None]
    if len(scored) < MIN_SCORED:
        raise AnalysisFailed("show_unusable", "Echo can't analyse this show yet: too few guests could be scored.")

    ids = [s.person["entity_id"] for s in scored]
    needs_fit_lens = bool(filters.age or filters.country or c3)
    width = reach_width([s.love.podcasts for s in scored])
    podcast_ids = [p for s in scored for p in s.love.podcasts[:width]]
    fit_lens = {"filter.type": PERSON, "signal.interests.entities": show.id}
    anchor_lens = {"filter.type": PERSON, "signal.interests.entities": anchor["entity_id"]} if anchor and c3 else None
    fit_scores, reach_scores, anchor_scores = await asyncio.gather(
        lens(client, fit_lens, ids) if needs_fit_lens else ready({}),
        lens(client, {"filter.type": PODCAST, "signal.interests.entities": show.id}, podcast_ids),
        lens(client, anchor_lens, ids) if anchor_lens else ready({}),
    )
    for item in scored:
        item.fit_raw = fit_scores.get(item.person["entity_id"], affinity(item.person) or 0.0)
        item.reach_raw = scoring.reach_raw([reach_scores.get(p) for p in item.love.podcasts[:width]])
        item.anchor_raw = anchor_scores.get(item.person["entity_id"]) if anchor_lens else None
    ranked = score(scored)
    analysis.guests = [guest_of(item, f"g{i + 1}") for i, item in enumerate(ranked)]
    await done("score")

    top = ranked[:EXPLAINED]
    show_ranks, guest_tags, ages, work = await asyncio.gather(
        show_tag_ranks(client, show.id),
        asyncio.gather(*(tags_of(client, item.person["entity_id"]) for item in top)),
        age_profiles(client, [show.id] + [item.person["entity_id"] for item in top]),
        optional(wikidata.work_of([item.person for item in top]), {}),
    )
    show_age = ages.get(show.id, {})
    tag_guests = Counter(key for tags in guest_tags for key in {tag_key(tag) for tag in tags})
    shared_by = Counter(p for s in scored for p in set(s.love.podcasts[:width]))
    top_podcasts = Counter(p for s in top for p in set(s.love.podcasts[:width]))
    shown: set[str] = set()
    for guest, item, tags in zip(analysis.guests, top, guest_tags, strict=False):
        podcasts = shared_podcasts(item.love, width, reach_scores, top_podcasts, len(top), shown)
        shown.update(podcasts)
        if found := work.get(item.person["entity_id"]):
            guest.bio = bio_of(item.person, guest.description, work=found) or guest.bio
            if found.page and WIKIPEDIA.match(found.page):
                guest.links = {"wikipedia": found.page, **guest.links}
        podcast_names = list(dict.fromkeys(item.love.names[p] for p in podcasts))
        guest.evidence = Evidence(
            shared_tastes=shared_tastes(podcast_names, shared_tags(show_ranks, tags, tag_guests, len(top))),
            shared_podcasts=podcast_names,
            new_podcasts=new_podcasts(item.love, width, reach_scores, shared_by, podcasts),
            ages=over_index(ages.get(item.person["entity_id"], {}), show_age),
        )
    await done("evidence")


async def guest_maps(client: QlooClient, analysis: Analysis, guest: Guest) -> GuestMaps:
    show_lists, guest_lists = await asyncio.gather(
        map_lists(client, analysis.show.id), map_lists(client, guest.id, analysis.show.id)
    )
    shared = {normalize(name) for name in (guest.evidence.shared_tastes if guest.evidence else [])}
    adds = {}
    for category, items in guest_lists.items():
        known = shared | {normalize(item.name) for item in show_lists.get(category, [])}
        adds[category] = [item for item in items if normalize(item.name) not in known]
    return GuestMaps(audience_map=rows_of(guest_lists), adds=rows_of(adds))


def lens_signals(age: AgeBucket | None, country: str | None) -> dict[str, str]:
    signals = {}
    if age:
        signals["signal.demographics.age"] = age
    if country:
        signals["signal.location.query"] = country
    return signals


async def lens_map(client: QlooClient, analysis: Analysis, age: AgeBucket | None, country: str | None) -> list[MapRow]:
    if not age and not country:
        return analysis.audience_map
    return rows_of(await map_lists(client, analysis.show.id, signals=lens_signals(age, country)))


async def guest_bridge(client: QlooClient, analysis: Analysis, guest: Guest) -> GuestBridge:
    show_lists, guest_lists = await asyncio.gather(
        map_lists(client, analysis.show.id), map_lists(client, guest.id, analysis.show.id)
    )
    loved_by_both = {normalize(name) for name in (guest.evidence.shared_tastes if guest.evidence else [])}
    both, yours, theirs = {}, {}, {}
    for category, _ in MAP_TYPES:
        ours = show_lists.get(category, [])
        their = guest_lists.get(category, [])
        our_rank = {normalize(item.name): rank for rank, item in enumerate(ours)}
        their_rank = {normalize(item.name): rank for rank, item in enumerate(their)}
        shared = sorted(
            (item for item in ours if normalize(item.name) in their_rank),
            key=lambda item: our_rank[normalize(item.name)] + their_rank[normalize(item.name)],
        )
        also = [item for item in their if normalize(item.name) in loved_by_both - our_rank.keys()]
        both[category] = shared + also
        yours[category] = [item for item in ours if normalize(item.name) not in their_rank]
        theirs[category] = [item for item in their if normalize(item.name) not in our_rank.keys() | loved_by_both]
    totals = {
        category: BridgeCount(both=len(both[category]), yours=len(yours[category]), theirs=len(theirs[category]))
        for category, _ in MAP_TYPES
        if both[category] or yours[category] or theirs[category]
    }
    return GuestBridge(ref=guest.ref, both=rows_of(both), yours=rows_of(yours), theirs=rows_of(theirs), totals=totals)


async def taste_fans(client: QlooClient, analysis: Analysis, ask: TasteAsk) -> TasteFans | None:
    wanted = normalize(ask.name)

    def find(rows: Sequence[MapRow]) -> MapItem | None:
        return next(
            (i for row in rows if row.category == ask.category for i in row.items if normalize(i.name) == wanted), None
        )

    item = find(await lens_map(client, analysis, ask.age, ask.country))
    if item is None or item.id is None:
        lists = await map_lists(client, analysis.show.id, signals=lens_signals(ask.age, ask.country))
        item = find([MapRow(category=category, items=items) for category, items in lists.items()]) or item
    if item is None:
        return None
    taste_id = item.id
    fans = TasteFans(category=ask.category, name=item.name, guests=[])
    if taste_id is None or not analysis.guests:
        return fans
    by_id = {guest.id: guest.ref for guest in analysis.guests}
    try:
        scores = await lens(client, {"filter.type": PERSON, "signal.interests.entities": taste_id}, list(by_id))
    except QlooError as error:
        if is_rejected_input(error):
            return fans
        raise
    ranked = sorted(((value, by_id[i]) for i, value in scores.items() if i in by_id), reverse=True)
    fans.guests = [TasteFan(ref=ref, affinity=round(value, 3)) for value, ref in ranked]
    return fans
