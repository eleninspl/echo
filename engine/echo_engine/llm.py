import json
from collections.abc import Collection, Iterable
from textwrap import indent
from typing import Any

from pydantic import ValidationError

from .config import get_settings
from .llm_client import LlmClient, LlmError, Schema
from .models import (
    THEME_LENGTH,
    Analysis,
    ChatDecision,
    Draft,
    DraftRequest,
    Episode,
    Evidence,
    Guest,
    GuestMaps,
    Idea,
    MapFocus,
    MapRow,
    Message,
    Person,
    Show,
    TasteFans,
)

IDEA_GUESTS = 10
TASTES_PER_CATEGORY = 6
TASTE_FANS_NAMED = 5

RULES = """You write for Echo, a tool that helps a podcast host find guests their audience will love.
Rules for everything you write:
- Use only the facts in the input. A person's one-line description and known_facts are all you know about them: add \
no books, shows, roles, quotes, awards or life events that aren't given there, even if you think you know them. \
Shared tastes are things both audiences like, never facts about the guest's life or work.
- known_facts are about a person's work. What they founded, led or are known for is why a host would book them: build \
on it. An employer listed there can be an early job, so never make an employer the subject of an episode, a title or \
a pitch.
- Echo knows nothing about anyone's gender: call a guest by name or "they", never "he", "she", "him", "his" or "her", \
and use neutral words for what they do (businessperson, not businessman).
- Tastes describe groups of listeners, never one person. Say it the way a person would: "your listeners tend to love", \
"their fans tend to like". Never use analytics words like over-index, affinity, skew, overlap, percentile or audience \
data, and never say that a listener will do something.
- Age groups are where a guest's fans stand out next to the show's listeners, not where most of them are: say \
"their fans stand out among people 25 to 34", never that they are mostly that age.
- Shared tastes are listed strongest first. Build on the first ones and on named shows, films, artists and podcasts. \
A broad tag such as humor, dance or celebrity culture is not a reason on its own: leave it out rather than build on it.
- Skip tastes that say little about anyone: weather, maps, search and review sites, and the biggest everyday brands.
- A guest's fans can have tastes that belong to someone else with the same name, such as car brands for a comedian. \
Leave out anything that doesn't fit the guest's description.
- Never mention religion, sexuality, ethnicity, health, politics or money troubles.
- An episode subject from the host (the_host_wants_an_episode_about) is the named film, TV show, artist, brand or \
game, never a place or a thing that shares its name. An episode theme is a lens on the episode: with a subject too, \
it's the subject seen through the theme. Build on them wherever they fit the guest, without forcing them.
- Never quote scores or other numbers (age groups are the one exception), and never say where the data comes from.
- Plain, warm, specific English. No hype words and no em dashes."""

LABELS = {
    "sweet_spot": "sweet spot: your listeners like them, their fans would like the show, their audience is new to you",
    "safe": "safe: your listeners like them, but their fans mostly listen to you already",
    "far": (
        "one-way: your listeners like them and their audience is new to you, but their fans are less likely to enjoy "
        "the show"
    ),
    "long_shot": "long shot: a weaker fit with your listeners",
    "balanced": "balanced: in between on fit, love back and reach",
}

SCORES = (
    "fit is how much the show's listeners like the guest, love_back how much the guest's fans would like the show, "
    "reach how new the guest's audience is to the show; each is 0 to 100 within this list of guests."
)

IDEA_SHAPE = """- reason: one or two short sentences, at most 35 words in all, to the host on why this guest suits \
the show: what they bring to it, backed by one or two of the strongest shared tastes, new podcasts or age groups \
given.
- title: an episode title, under 70 characters.
- pitch: two short sentences, at most 45 words in all, a listener would read: what happens in the episode and why \
it's worth hearing, built on what the two audiences share. No talk of fans or audiences here, and no other podcasts."""

IDEAS_TASK = f"""For each guest below, write:
{IDEA_SHAPE}
- description_fits: false when the guest's description and known_facts plainly belong to someone other than the \
person their shared tastes and new podcasts point to, such as a botanist whose fans love real estate and business \
podcasts; otherwise true. When it's false, write the idea from the tastes alone and never use the description or \
known_facts.
Give every guest a different angle, one only they could take: build it on what their known_facts and description say \
they founded, led, made or are known for, and on their strongest shared tastes. Vary how the reasons open and how the \
titles are built: not every reason should start with the guest's fans, and no two titles share their wording or shape. \
When the host wants an episode about a subject, every idea is about that subject. A theme is a lens, not a title: each \
idea finds a different side of it through this guest's own work, and most titles don't repeat the theme's words. With \
both, each idea is the subject seen through the theme. Answer for every ref. {SCORES}"""

EPISODE_TASK = """Plan one episode of the show with this guest, built on their idea when they have one:
- title: the idea's title, word for word, when there is an idea; otherwise one under 70 characters.
- summary: two or three sentences on the episode and why both audiences would care.
- segments: three or four, each with a title, two or three talking points, and minutes. One segment is on the guest's \
own work, what their known_facts and description say they founded, led, made or are known for; one is on the \
strongest shared taste, a named show, film or book when there is one. A podcast both audiences love can give a \
segment its subject, never its name. Never build a segment on a broad tag (consumer electronics, aging, digital \
culture) or on an employer from known_facts.
- minutes: when the host gave an episode_length, each segment's share of it, adding up to it less a few minutes for \
the open and the close; otherwise null.
- questions: five questions only this guest could answer, at least two about their own work from known_facts and \
the description. None that would fit any guest.
Talking points are things to talk about on air, not facts about the audiences, and never plug another podcast."""

CHAT_TASK = f"""You are Echo, talking with the host about this list of guests. Pick one action:
- leave_out: the host doesn't want one of these guests, such as someone who has already been on the show or isn't \
right for it. Give guest_ref, and why: had_on when they've been on the show, else not_for_us. Echo leaves them out of \
this page and of every run after it.
- rerun: the host wants different guests. Give the complete filters to use: start from the current filters and \
change only what the host asked for. fame is any, less_famous or rising. age is one of the buckets or null. country is \
always null: Echo doesn't filter by country, so when the host asks for one, say so and change nothing. episode_about \
is {{query, type}} for an episode about one named movie, tv_show, \
artist, brand or videogame, or null. theme is a topic for the episode in a few plain words (road trips, first jobs, \
burnout), up to {THEME_LENGTH} characters, or null: use it for any subject that isn't one named title.
- rewrite: the host wants a different idea for one guest, such as funnier or shorter. Give guest_ref (the first idea \
is the first guest listed with one) and the new idea in the same shape as every idea, keeping what the host didn't \
ask to change:
{indent(IDEA_SHAPE, "  ")}
- none: just answer, for questions about the guests, what the listeners like, or how Echo works.
reply: one or two sentences to the host saying what you did, or the answer. Set the fields that don't apply to null, \
and never say you can't leave a guest out.
map: point the taste map on the page at what the reply is about, or null. category is the one asked about or null. \
tastes are names from what_your_listeners_love that the reply mentions, written exactly as there, or empty. The map \
shows all the listeners: it can't show one age group or country. A question about what the listeners like is action \
none with a map: rerun is only for different guests.
guest_refs: the refs of the guests the reply names, in the order named, or empty.
When the host asks about one taste (the_host_asks_about_this_taste), answer in up to three sentences: whose fans \
tend to like it too, from guests_whose_fans_like_it_most, strongest first, and an episode built on it with one of \
them. If none are given, say Echo can't tell whose fans like it and still suggest an episode. Point the map at that \
taste and set guest_refs.
{SCORES}"""

DRAFTS_TASK = """Write an invitation email from the host to each guest below, one per ref.
- subject: under 70 characters.
- body: 100 to 160 words. What the show is, from its description, as "we" ("On the show we talk with founders \
about..."); why this guest, through what the two audiences share, in plain words; the episode idea; a clear ask; a \
sign-off with the host's name, or "[Your name]" if it isn't given. The sign-off is the only place the sender is named: \
whoever signs may not be a host the description names, so never introduce them by name and never name the show's \
hosts or anyone else from the description. Use the host's note if there is one, in every email. A guest may also \
have their own note from the host (note_for_this_guest): use it in that guest's email only, as the host's own angle.
- A note can be something to say or a way to write (a length, a tone, a style). Say what it gives; write the way it \
asks, over the length and style above, keeping the idea, the ask, the sign-off and the practical details.
- practical_details, when a guest has them: state each one plainly in that guest's email, in a sentence or two near \
the ask, with dates, fees and lengths exactly as given (the rule on numbers doesn't apply to them). Never invent a \
date, fee, format, place, length, release or deadline that isn't given: leave out what's missing.
- What the guest gains, in one sentence after the why: when their love_back is 50 or more, their own fans tend to \
enjoy shows like ours (name one or two from podcasts_both_audiences_love as shows like ours, when there are any), so \
it's an episode worth sharing with them; when their reach is 50 or more, many of our listeners would be new to them. \
Say it of groups of listeners, never as a promise.
Write as the host, to the guest. Mention one or two shared tastes the way a person would ("our listeners are big \
Kids in the Hall fans too"), with no other talk of their fans, audiences, data, scores or tools, and don't flatter \
beyond the facts."""

REVISE_TASK = """Rewrite this invitation email as the host asks. Keep everything the instruction doesn't touch, \
including what the host's notes asked for and the practical details, and keep the same rules."""

BRIEFING_TASK = """Write a one-page briefing in Markdown for the host to read before recording with this guest, \
with these sections:
# <guest name>
## Who they are (only the description and known facts given, then the read_up line word for word when there is \
one. Never apologise for what's missing)
## Where your audiences meet
## What their audience adds
## The episode
## Questions to ask (five, numbered)
Short bullets, no tables. Where the audiences meet is named shows, films, books and podcasts, never broad tags such \
as consumer electronics or digital culture. If the episode was already planned (the_episode), follow it and use its \
title. The questions are ones only this guest could answer, about their own work and tastes, never about their fans \
or either audience."""

HOSTS_SYSTEM = """You check a podcast's guest list for its own hosts. From the show's title and description and what \
you know about the show, return the ids of the people who host or regularly co-host it. Guests who appeared once \
don't count. When unsure, leave them out."""

TEXT: Schema = {"type": "string"}
BOOLEAN: Schema = {"type": "boolean"}


def obj(**properties: Schema) -> Schema:
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


def array(items: Schema) -> Schema:
    return {"type": "array", "items": items}


def one_of(values: Iterable[str]) -> Schema:
    return {"type": "string", "enum": list(values)}


def nullable(schema: Schema) -> Schema:
    return {"anyOf": [schema, {"type": "null"}]}


IDEA = obj(reason=TEXT, title=TEXT, pitch=TEXT)
KINDS = {
    "movie": "the film",
    "tv_show": "the TV show",
    "artist": "the artist",
    "brand": "the brand",
    "videogame": "the video game",
}
LEAVE_OUT_WHY = ["had_on", "not_for_us"]
READ_MORE = {"wikipedia": "Wikipedia", "website": "their website", "imdb": "IMDb"}
AGES = ["24_and_younger", "25_to_29", "30_to_34", "35_to_44", "45_to_54", "55_and_older"]
FILTERS = obj(
    fame=one_of(["any", "less_famous", "rising"]),
    age=nullable(one_of(AGES)),
    country=nullable(TEXT),
    episode_about=nullable(obj(query=TEXT, type=one_of(["movie", "tv_show", "artist", "brand", "videogame"]))),
    theme=nullable(TEXT),
)


def ready() -> bool:
    settings = get_settings()
    return settings.llm_backend != "openrouter" or bool(settings.openrouter_api_key)


def client() -> LlmClient:
    if not ready():
        raise NotImplementedError("The LLM isn't set up: OPENROUTER_API_KEY is missing")
    return LlmClient.from_settings()


async def ask(system: str, task: str, facts: dict[str, Any], schema: Schema, name: str) -> dict[str, Any]:
    prompt = f"{task}\n\n{json.dumps(facts, ensure_ascii=False, indent=1)}"
    async with client() as llm:
        return (await llm.json(system, prompt, schema, name)).data


def percent(value: float | None) -> int | None:
    return None if value is None else round(value * 100)


def names_by_category(rows: list[MapRow]) -> dict[str, list[str]]:
    return {row.category: [item.name for item in row.items[:TASTES_PER_CATEGORY]] for row in rows if row.items}


def show_facts(analysis: Analysis) -> dict[str, Any]:
    facts: dict[str, Any] = {
        "show": analysis.show.title,
        "description": analysis.show.description,
        "what_your_listeners_love": names_by_category(analysis.audience_map),
    }
    about = analysis.filters.episode_about
    if about and about.used:
        facts["the_host_wants_an_episode_about"] = f"{KINDS[about.type]} {about.used}"
    if analysis.filters.theme:
        facts["episode_theme_from_the_host"] = analysis.filters.theme
    return facts


def guest_facts(guest: Guest) -> dict[str, Any]:
    evidence = guest.evidence or Evidence()
    return {
        "ref": guest.ref,
        "name": guest.name,
        "description": guest.description,
        "known_facts": guest.bio,
        "label": LABELS[guest.label],
        "fit": percent(guest.scores.fit),
        "love_back": percent(guest.scores.love_back),
        "reach": percent(guest.scores.reach),
        "shared_tastes_strongest_first": evidence.shared_tastes,
        "podcasts_both_audiences_love": evidence.shared_podcasts,
        "new_podcasts_their_fans_bring": evidence.new_podcasts,
        "age_groups_where_their_fans_stand_out": [age.replace("_", " ") for age in evidence.ages],
    }


def guest_with_maps(guest: Guest, maps: GuestMaps) -> dict[str, Any]:
    return {
        **guest_facts(guest),
        "idea": guest.idea.model_dump() if guest.idea else None,
        "what_their_fans_love": names_by_category(maps.audience_map),
        "what_their_fans_love_that_is_new_to_your_listeners": names_by_category(maps.adds),
    }


def checked[T](model: type[T], data: Any) -> T:
    try:
        return model.model_validate(data)
    except ValidationError as error:
        raise LlmError(f"The model's answer didn't fit {model.__name__}: {error}") from error


async def find_hosts(show: Show, people: list[Person]) -> set[str]:
    if not people:
        return set()
    ids = [person.id for person in people]
    facts = {
        "show": show.title,
        "description": show.description,
        "people": [person.model_dump() for person in people],
    }
    data = await ask(
        HOSTS_SYSTEM, "Which of these people host the show?", facts, obj(host_ids=array(one_of(ids))), "hosts"
    )
    return set(data["host_ids"]) & set(ids)


async def write_ideas(analysis: Analysis) -> tuple[dict[str, Idea], set[str]]:
    guests = [guest for guest in analysis.guests if guest.evidence is not None][:IDEA_GUESTS]
    if not guests:
        return {}, set()
    refs = [guest.ref for guest in guests]
    facts = {**show_facts(analysis), "guests": [guest_facts(guest) for guest in guests]}
    schema = obj(ideas=array(obj(ref=one_of(refs), description_fits=BOOLEAN, reason=TEXT, title=TEXT, pitch=TEXT)))
    data = await ask(RULES, IDEAS_TASK, facts, schema, "ideas")
    ideas, mixed_up = {}, set()
    for item in data["ideas"]:
        if item["ref"] in refs:
            ideas[item["ref"]] = checked(Idea, {key: item[key] for key in ("reason", "title", "pitch")})
            if item.get("description_fits") is False:
                mixed_up.add(item["ref"])
    return ideas, mixed_up


async def write_episode(analysis: Analysis, guest: Guest, maps: GuestMaps, length: str | None = None) -> Episode:
    facts = {**show_facts(analysis), "guest": guest_with_maps(guest, maps), "episode_length": length}
    segment = obj(title=TEXT, points=array(TEXT), minutes=nullable({"type": "integer"}))
    schema = obj(title=TEXT, summary=TEXT, segments=array(segment), questions=array(TEXT))
    episode = checked(Episode, await ask(RULES, EPISODE_TASK, facts, schema, "episode"))
    if guest.idea:
        episode.title = guest.idea.title
    if not length:
        for part in episode.segments:
            part.minutes = None
    return episode


def map_names(analysis: Analysis) -> dict[str, str]:
    return {item.name: row.category for row in analysis.audience_map for item in row.items}


def taste_facts(guests: list[Guest], taste: TasteFans) -> dict[str, Any]:
    names = {guest.ref: guest.name for guest in guests}
    return {
        "name": taste.name,
        "category": taste.category,
        "guests_whose_fans_like_it_most": [
            {"ref": fan.ref, "name": names[fan.ref]} for fan in taste.guests[:TASTE_FANS_NAMED] if fan.ref in names
        ],
    }


def pointed(analysis: Analysis, focus: MapFocus | None, taste: TasteFans | None) -> MapFocus | None:
    names = map_names(analysis)
    if focus is None:
        return MapFocus(category=taste.category, tastes=[taste.name]) if taste else None
    tastes = [name for name in dict.fromkeys(focus.tastes) if name in names]
    if taste and taste.name not in tastes:
        tastes.insert(0, taste.name)
    category = focus.category if focus.category in set(names.values()) else None
    if not (category or tastes):
        return None
    return MapFocus(category=category, tastes=tastes)


async def chat(
    analysis: Analysis, messages: list[Message], exclude: Collection[str] = (), taste: TasteFans | None = None
) -> ChatDecision:
    guests = [guest for guest in analysis.guests if guest.id not in exclude]
    refs = [guest.ref for guest in guests]
    with_ideas = {guest.ref for guest in guests if guest.idea is not None}
    names = list(map_names(analysis))
    categories = list(dict.fromkeys(map_names(analysis).values()))
    facts = {
        **show_facts(analysis),
        "current_filters": analysis.filters.model_dump(exclude={"episode_about": {"used"}, "exclude": True}),
        "age_buckets": AGES,
        "guests": [{**guest_facts(guest), "idea_title": guest.idea.title if guest.idea else None} for guest in guests],
        "conversation": [message.model_dump() for message in messages],
    }
    if taste is not None:
        facts["the_host_asks_about_this_taste"] = taste_facts(guests, taste)
    schema = obj(
        reply=TEXT,
        action=one_of(["rerun", "rewrite", "leave_out", "none"]),
        filters=nullable(FILTERS),
        guest_ref=nullable(one_of(refs)),
        idea=nullable(IDEA),
        why=nullable(one_of(LEAVE_OUT_WHY)),
        map=nullable(
            obj(
                category=nullable(one_of(categories) if categories else TEXT),
                tastes=array(one_of(names) if names else TEXT),
            )
        ),
        guest_refs=array(one_of(refs) if refs else TEXT),
    )
    data = await ask(RULES, CHAT_TASK, facts, schema, "chat_decision")
    if isinstance(theme := (data.get("filters") or {}).get("theme"), str):
        data["filters"]["theme"] = theme[:THEME_LENGTH]
    if isinstance(data.get("filters"), dict):
        data["filters"]["country"] = None
    decision = checked(ChatDecision, data)
    if decision.action == "rerun" and decision.filters is None:
        decision.action = "none"
    if decision.action == "rewrite" and (decision.guest_ref not in with_ideas or decision.idea is None):
        decision.action = "none"
    if decision.action == "leave_out":
        if decision.guest_ref not in refs:
            decision.action = "none"
        decision.why = decision.why or "not_for_us"
    decision.map = pointed(analysis, decision.map, taste)
    decision.guest_refs = [ref for ref in dict.fromkeys(decision.guest_refs) if ref in refs]
    return decision


async def write_drafts(analysis: Analysis, guests: list[Guest], request: DraftRequest) -> list[Draft]:
    host = {"host_name": request.host_name, "host_note": request.note}
    if request.previous is not None and request.instruction is not None:
        guest = guests[0]
        facts = {
            **show_facts(analysis),
            **host,
            "guest": {
                **guest_facts(guest),
                "note_for_this_guest": request.notes.get(guest.ref),
                "practical_details": request.details_for(guest.ref).plainly() or None,
            },
            "draft": request.previous.model_dump(),
            "instruction": request.instruction,
        }
        data = await ask(RULES, REVISE_TASK, facts, obj(subject=TEXT, body=TEXT), "draft")
        return [checked(Draft, {**data, "guest_ref": guest.ref})]
    refs = [guest.ref for guest in guests]
    facts = {
        **show_facts(analysis),
        **host,
        "guests": [
            {
                **guest_facts(guest),
                "idea": guest.idea.model_dump() if guest.idea else None,
                "note_for_this_guest": request.notes.get(guest.ref),
                "practical_details": request.details_for(guest.ref).plainly() or None,
            }
            for guest in guests
        ],
    }
    schema = obj(drafts=array(obj(ref=one_of(refs), subject=TEXT, body=TEXT)))
    data = await ask(RULES, DRAFTS_TASK, facts, schema, "drafts")
    written = {item["ref"]: item for item in data["drafts"] if item["ref"] in refs}
    if set(written) != set(refs):
        raise LlmError(f"The model wrote drafts for {sorted(written)}, not {refs}")
    return [
        checked(Draft, {"guest_ref": ref, "subject": written[ref]["subject"], "body": written[ref]["body"]})
        for ref in refs
    ]


def read_up(guest: Guest) -> str | None:
    if guest.bio:
        return None
    site = next((site for site in READ_MORE if guest.links.get(site)), None)
    if site is None:
        return "Read up on them before you record."
    return f"Read up before you record: [{READ_MORE[site]}]({guest.links[site]})"


async def write_briefing(analysis: Analysis, guest: Guest, maps: GuestMaps, episode: Episode | None = None) -> str:
    facts = {**show_facts(analysis), "guest": {**guest_with_maps(guest, maps), "read_up": read_up(guest)}}
    if episode is not None:
        facts["the_episode"] = episode.model_dump()
    data = await ask(RULES, BRIEFING_TASK, facts, obj(markdown=TEXT), "briefing")
    return data["markdown"]


async def past_guest_names(show: Show, itunes_id: str) -> list[str]:
    raise NotImplementedError("L7: past guests")
