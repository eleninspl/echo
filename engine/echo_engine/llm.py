import json
from collections.abc import Iterable
from textwrap import indent
from typing import Any

from pydantic import ValidationError

from .config import get_settings
from .llm_client import LlmClient, LlmError, Schema
from .models import (
    Analysis,
    ChatDecision,
    Draft,
    DraftRequest,
    Episode,
    Evidence,
    Guest,
    GuestMaps,
    Idea,
    MapRow,
    Message,
    Person,
    Show,
)

IDEA_GUESTS = 10
TASTES_PER_CATEGORY = 6

RULES = """You write for Echo, a tool that helps a podcast host find guests their audience will love.
Rules for everything you write:
- Use only the facts in the input. A person's one-line description is all you know about them: add no books, shows, \
roles, quotes, awards or life events that aren't given, even if you think you know them. Shared tastes are things \
both audiences like, never facts about the guest's life or work.
- Tastes describe groups of listeners, never one person. Say it the way a person would: "your listeners tend to love", \
"their fans tend to like". Never use analytics words like over-index, affinity, skew, overlap, percentile or audience \
data, and never say that a listener will do something. Say age groups plainly: "many of their fans are 35 to 44".
- Shared tastes are listed strongest first. Build on the first ones and on named shows, films, artists and podcasts. \
A broad tag such as humor, dance or celebrity culture is not a reason on its own: leave it out rather than build on it.
- Skip tastes that say little about anyone: weather, maps, search and review sites, and the biggest everyday brands.
- A guest's fans can have tastes that belong to someone else with the same name, such as car brands for a comedian. \
Leave out anything that doesn't fit the guest's description.
- Never mention religion, sexuality, ethnicity, health, politics or money troubles.
- Echo knows nothing about anyone's gender: call a guest by name, or "they", never "he" or "she".
- Never quote scores or other numbers (age groups are the one exception), and never say where the data comes from.
- Plain, warm, specific English. No hype words and no em dashes."""

LABELS = {
    "sweet_spot": "sweet spot: your listeners like them, their fans would like the show, their audience is new to you",
    "safe": "safe: your listeners like them, but their fans mostly listen to you already",
    "far": "far: their audience is new to you, but less likely to enjoy the show",
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
Give every guest a different angle. Vary how the reasons open and how the titles are built: not every reason should \
start with the guest's fans. Answer for every ref. {SCORES}"""

EPISODE_TASK = """Plan one episode of the show with this guest:
- title: under 70 characters.
- summary: two or three sentences on the episode and why both audiences would care.
- segments: three or four, each with a title and two or three talking points.
- questions: five questions the host could ask, about the guest's work and tastes in general terms.
Build each segment on a strong shared taste or on something specific the guest's fans bring, never on a broad tag. \
Talking points are things to talk about on air, not facts about the audiences, and never plug another podcast."""

CHAT_TASK = f"""You are Echo, talking with the host about this list of guests. Pick one action:
- rerun: the host wants different guests. Give the complete filters to use: start from the current filters and \
change only what the host asked for. fame is any, less_famous or rising. age is one of the buckets or null. country is \
an English country name or null. episode_about is {{query, type}} for an episode about a movie, tv_show, artist, brand \
or videogame, or null.
- rewrite: the host wants a different idea for one guest. Give guest_ref and the new idea, in the same shape as \
every idea:
{indent(IDEA_SHAPE, "  ")}
- none: just answer, for questions about the guests or how Echo works.
reply: one or two sentences to the host saying what you did, or the answer. Set the fields that don't apply to null.
{SCORES}"""

DRAFTS_TASK = """Write an invitation email from the host to each guest below, one per ref.
- subject: under 70 characters.
- body: 100 to 160 words. Who the host is and what the show is, from its description; why this guest, through what \
the two audiences share, in plain words; the episode idea; a clear ask; a sign-off with the host's name, or \
"[Your name]" if it isn't given. Use the host's note if there is one.
Write as the host, to the guest. Mention one or two shared tastes the way a person would ("our listeners are big \
Kids in the Hall fans too"), with no talk of audiences, data, scores or tools, and don't flatter beyond the facts. \
Never tell the guest what their own fans listen to or like."""

REVISE_TASK = """Rewrite this invitation email as the host asks. Keep everything the instruction doesn't touch, \
and keep the same rules."""

BRIEFING_TASK = """Write a one-page briefing in Markdown for the host to read before recording with this guest, \
with these sections:
# <guest name>
## Who they are (only the description given)
## Where your audiences meet
## What their audience adds
## The episode
## Questions to ask (five, numbered)
Short bullets, no tables. The questions are about the guest's work and tastes in general terms, never about their \
fans or either audience."""

HOSTS_SYSTEM = """You check a podcast's guest list for its own hosts. From the show's title and description and what \
you know about the show, return the ids of the people who host or regularly co-host it. Guests who appeared once \
don't count. When unsure, leave them out."""

TEXT: Schema = {"type": "string"}


def obj(**properties: Schema) -> Schema:
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


def array(items: Schema) -> Schema:
    return {"type": "array", "items": items}


def one_of(values: Iterable[str]) -> Schema:
    return {"type": "string", "enum": list(values)}


def nullable(schema: Schema) -> Schema:
    return {"anyOf": [schema, {"type": "null"}]}


IDEA = obj(reason=TEXT, title=TEXT, pitch=TEXT)
AGES = ["24_and_younger", "25_to_29", "30_to_34", "35_to_44", "45_to_54", "55_and_older"]
FILTERS = obj(
    fame=one_of(["any", "less_famous", "rising"]),
    age=nullable(one_of(AGES)),
    country=nullable(TEXT),
    episode_about=nullable(obj(query=TEXT, type=one_of(["movie", "tv_show", "artist", "brand", "videogame"]))),
)


def client() -> LlmClient:
    settings = get_settings()
    if settings.llm_backend == "openrouter" and not settings.openrouter_api_key:
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
        facts["the_host_wants_an_episode_about"] = about.used
    return facts


def guest_facts(guest: Guest) -> dict[str, Any]:
    evidence = guest.evidence or Evidence()
    return {
        "ref": guest.ref,
        "name": guest.name,
        "description": guest.description,
        "label": LABELS[guest.label],
        "fit": percent(guest.scores.fit),
        "love_back": percent(guest.scores.love_back),
        "reach": percent(guest.scores.reach),
        "shared_tastes_strongest_first": evidence.shared_tastes,
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


async def write_ideas(analysis: Analysis) -> dict[str, Idea]:
    guests = [guest for guest in analysis.guests if guest.evidence is not None][:IDEA_GUESTS]
    if not guests:
        return {}
    refs = [guest.ref for guest in guests]
    facts = {**show_facts(analysis), "guests": [guest_facts(guest) for guest in guests]}
    schema = obj(ideas=array(obj(ref=one_of(refs), reason=TEXT, title=TEXT, pitch=TEXT)))
    data = await ask(RULES, IDEAS_TASK, facts, schema, "ideas")
    ideas = {}
    for item in data["ideas"]:
        if item["ref"] in refs:
            ideas[item["ref"]] = checked(Idea, {key: item[key] for key in ("reason", "title", "pitch")})
    return ideas


async def write_episode(analysis: Analysis, guest: Guest, maps: GuestMaps) -> Episode:
    facts = {**show_facts(analysis), "guest": guest_with_maps(guest, maps)}
    schema = obj(title=TEXT, summary=TEXT, segments=array(obj(title=TEXT, points=array(TEXT))), questions=array(TEXT))
    return checked(Episode, await ask(RULES, EPISODE_TASK, facts, schema, "episode"))


async def chat(analysis: Analysis, messages: list[Message]) -> ChatDecision:
    refs = [guest.ref for guest in analysis.guests if guest.idea is not None] or [g.ref for g in analysis.guests]
    facts = {
        **show_facts(analysis),
        "current_filters": analysis.filters.model_dump(exclude={"episode_about": {"used"}}),
        "age_buckets": AGES,
        "guests": [
            {**guest_facts(guest), "idea_title": guest.idea.title if guest.idea else None} for guest in analysis.guests
        ],
        "conversation": [message.model_dump() for message in messages],
    }
    schema = obj(
        reply=TEXT,
        action=one_of(["rerun", "rewrite", "none"]),
        filters=nullable(FILTERS),
        guest_ref=nullable(one_of(refs)),
        idea=nullable(IDEA),
    )
    decision = checked(ChatDecision, await ask(RULES, CHAT_TASK, facts, schema, "chat_decision"))
    if decision.action == "rerun" and decision.filters is None:
        decision.action = "none"
    if decision.action == "rewrite" and (decision.guest_ref not in refs or decision.idea is None):
        decision.action = "none"
    return decision


async def write_drafts(analysis: Analysis, guests: list[Guest], request: DraftRequest) -> list[Draft]:
    host = {"host_name": request.host_name, "host_note": request.note}
    if request.previous is not None and request.instruction is not None:
        guest = guests[0]
        facts = {
            **show_facts(analysis),
            **host,
            "guest": guest_facts(guest),
            "draft": request.previous.model_dump(),
            "instruction": request.instruction,
        }
        data = await ask(RULES, REVISE_TASK, facts, obj(subject=TEXT, body=TEXT), "draft")
        return [checked(Draft, {**data, "guest_ref": guest.ref})]
    refs = [guest.ref for guest in guests]
    facts = {
        **show_facts(analysis),
        **host,
        "guests": [{**guest_facts(guest), "idea": guest.idea.model_dump() if guest.idea else None} for guest in guests],
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


async def write_briefing(analysis: Analysis, guest: Guest, maps: GuestMaps) -> str:
    facts = {**show_facts(analysis), "guest": guest_with_maps(guest, maps)}
    data = await ask(RULES, BRIEFING_TASK, facts, obj(markdown=TEXT), "briefing")
    return data["markdown"]


async def past_guest_names(show: Show, itunes_id: str) -> list[str]:
    raise NotImplementedError("L7: past guests")
