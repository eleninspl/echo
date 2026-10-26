"""Mock mode's stand-ins for the LLM chat and for a run with filters, on the invented example data.

The chat reads the last message for a few keywords and answers the way the real chat would: a rerun with new
filters, a rewritten idea, or a plain answer. A run reorders and trims the example guests for its filters, so a
rerun visibly changes the page. Never used outside mock mode."""

import re
from typing import get_args
from zlib import crc32

from . import scoring
from .models import THEME_LENGTH, AgeBucket, AnchorType, ChatDecision, EpisodeAbout, Filters, Guest, Idea, Message

AGES: list[AgeBucket] = list(get_args(AgeBucket))
AGE_WORDS = {
    "24_and_younger": "24 and younger",
    "25_to_29": "25 to 29",
    "30_to_34": "30 to 34",
    "35_to_44": "35 to 44",
    "45_to_54": "45 to 54",
    "55_and_older": "55 and older",
}
COUNTRIES = [
    "Argentina", "Australia", "Austria", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Denmark",
    "Egypt", "Finland", "France", "Germany", "Greece", "India", "Indonesia", "Ireland", "Israel", "Italy", "Japan",
    "Kenya", "Mexico", "Netherlands", "New Zealand", "Nigeria", "Norway", "Philippines", "Poland", "Portugal",
    "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Turkey", "United Kingdom", "United States",
]  # fmt: skip
COUNTRY_ALIASES = {"uk": "United Kingdom", "britain": "United Kingdom", "us": "United States", "usa": "United States",
                   "america": "United States", "korea": "South Korea"}  # fmt: skip
AGE_FLOORS = [0, 25, 30, 35, 45, 55]
ANCHOR_WORDS: dict[str, AnchorType] = {
    "film": "movie", "movie": "movie", "tv show": "tv_show", "show": "tv_show", "series": "tv_show",
    "band": "artist", "artist": "artist", "singer": "artist", "musician": "artist", "album": "artist",
    "brand": "brand", "videogame": "videogame", "video game": "videogame", "game": "videogame",
}  # fmt: skip
ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]
HELP = (
    "Mock mode understands a few asks: younger, older or an age; less famous or rising; a country; "
    "an episode about a film, show, artist or brand by name; a theme; or a funnier, shorter or new take on the "
    "first idea."
)
# Fewer guests than this after the filters fail the run, as the real engine does.
MIN_GUESTS = 5


def decide(guests: list[Guest], current: Filters, messages: list[Message]) -> ChatDecision:
    text = next((m.content for m in reversed(messages) if m.role == "user"), "").strip()
    said = " ".join(text.lower().split())
    if re.search(r"\b(idea|funn|shorter|rewrite|punchier|lighter|serious)", said):
        return rewrite(guests, said)
    filters, unclear = changed(current, text, said)
    if unclear:
        return ChatDecision(reply=unclear, action="none")
    if filters is None:
        return ChatDecision(reply=HELP, action="none")
    if filters == current:
        return ChatDecision(reply="Those are already the filters on this page.", action="none")
    phrases = describe(filters)
    reply = (
        f"Mock mode: running again for {', '.join(phrases)}." if phrases else "Mock mode: running again for everyone."
    )
    return ChatDecision(reply=reply, action="rerun", filters=filters)


def rewrite(guests: list[Guest], said: str) -> ChatDecision:
    with_ideas = [guest for guest in guests if guest.idea is not None]
    if not with_ideas:
        return ChatDecision(reply="None of these guests has an idea to rewrite.", action="none")
    guest = next((g for g in with_ideas if g.name.lower() in said), None)
    if guest is None:
        position = next((i for i, word in enumerate(ORDINALS) if re.search(rf"\b{word}\b", said)), 0)
        guest = with_ideas[min(position, len(with_ideas) - 1)]
    idea = guest.idea
    assert idea is not None
    if "short" in said:
        first = re.split(r"(?<=[.!?])\s", idea.pitch)[0]
        new = Idea(reason=idea.reason, title=" ".join(idea.title.split()[:4]), pitch=first)
        how = "a shorter"
    elif re.search(r"funn|light|joke|laugh", said):
        new = Idea(reason=idea.reason, title=f"{idea.title}, the funny one", pitch=f"A lighter take. {idea.pitch}")
        how = "a funnier"
    else:
        new = Idea(reason=idea.reason, title=f"Another take: {idea.title}", pitch=idea.pitch)
        how = "a new"
    return ChatDecision(
        reply=f"Mock mode: {how} take on the idea for {guest.name}.", action="rewrite", guest_ref=guest.ref, idea=new
    )


def changed(current: Filters, text: str, said: str) -> tuple[Filters | None, str | None]:
    """The filters the message asks for, or None when it asks for none, and a question back when it's unclear."""
    if re.search(r"\b(reset|clear (the )?filters|start over|no filters|everyone again)\b", said):
        return Filters(), None
    update: dict = {}
    position = AGES.index(current.age) if current.age else None
    if re.search(r"\byoung", said):
        update["age"] = "25_to_29" if position is None else AGES[max(position - 1, 0)]
    elif re.search(r"\bold(er)?\b", said):
        update["age"] = "45_to_54" if position is None else AGES[min(position + 1, len(AGES) - 1)]
    elif age := age_in(said):
        update["age"] = age
    elif re.search(r"\bany age\b", said):
        update["age"] = None
    if re.search(r"\b(less famous|lesser.known|less known|smaller|niche|under the radar|unknown)", said):
        update["fame"] = "less_famous"
    elif re.search(r"\b(rising|up.and.coming|emerging|new names)", said):
        update["fame"] = "rising"
    elif re.search(r"\b(any fame|famous|big names)\b", said):
        update["fame"] = "any"
    if re.search(r"\b(anywhere|any country|every country)\b", said):
        update["country"] = None
    elif country := country_in(said):
        update["country"] = country
    if re.search(r"\b(no theme|drop the theme|without a theme)\b", said):
        update["theme"] = None
    if re.search(r"\b(no film|no subject|drop the (film|subject))\b", said):
        update["episode_about"] = None
    about = re.search(r"\b(?:about|(?:episode|one|something) on)\s+(.+)$", text, re.IGNORECASE)
    if re.match(r"(what|how) about\b", said) or (
        about and re.search(r"\b(younger|older|famous|rising|listeners)\b", about.group(1).lower())
    ):
        about = None
    if about:
        subject = about.group(1).strip(" .!?\"'“”")
        kind = re.match(r"(?:the |a |an )?(" + "|".join(ANCHOR_WORDS) + r")\b\s*(.*)$", subject, re.IGNORECASE)
        if kind:
            name = kind.group(2).strip(" .!?\"'“”")
            if not name:
                return None, f'Which {kind.group(1).lower()}? Give its name, for example "about the film Heat".'
            update["episode_about"] = EpisodeAbout(query=name[:100], type=ANCHOR_WORDS[kind.group(1).lower()])
        elif quoted := re.search(r"[\"“]([^\"”]+)[\"”]", text):
            update["episode_about"] = EpisodeAbout(query=quoted.group(1)[:100], type="movie")
        elif subject:
            update["theme"] = re.sub(r"^(?:the |a |an )", "", subject, flags=re.IGNORECASE)[:THEME_LENGTH]
    elif theme := re.search(r"\btheme(?: is|:)?\s+(.+)$", text, re.IGNORECASE):
        update["theme"] = theme.group(1).strip(" .!?\"'“”")[:THEME_LENGTH]
    if not update:
        return None, None
    return current.model_copy(update=update), None


def age_in(said: str) -> AgeBucket | None:
    if re.search(r"\b(under 25|teens|gen z)\b", said):
        return "24_and_younger"
    if re.search(r"\b(over 55|55\+|retired)\b", said):
        return "55_and_older"
    number = re.search(r"\b(?:aged?|in their|around)\s+([1-9]\d)|\b([1-9]\d)(?:s\b|\s*(?:to|-)\s*\d\d|[- ]year)", said)
    if not number:
        return None
    age = int(number.group(1) or number.group(2))
    return next(bucket for bucket, low in reversed(list(zip(AGES, AGE_FLOORS, strict=True))) if age >= low)


def country_in(said: str) -> str | None:
    for country in COUNTRIES:
        if re.search(rf"\b{country.lower()}\b", said):
            return country
    for alias, country in COUNTRY_ALIASES.items():
        if re.search(rf"\b(in|from) (the )?{alias}\b", said):
            return country
    return None


def describe(filters: Filters) -> list[str]:
    phrases = []
    if filters.age:
        phrases.append(f"listeners aged {AGE_WORDS[filters.age]}")
    if filters.fame != "any":
        phrases.append("less famous guests" if filters.fame == "less_famous" else "rising guests")
    if filters.country:
        phrases.append(f"listeners in {filters.country}")
    if filters.episode_about:
        phrases.append(f"an episode about {filters.episode_about.query}")
    if filters.theme:
        phrases.append(f"an episode on {filters.theme}")
    return phrases


def guests_for(guests: list[Guest], filters: Filters) -> list[Guest]:
    """The example guests as a run with these filters might return them: trimmed, scored again and reordered.
    Fewer than MIN_GUESTS means the filters are too narrow."""
    pool = [guest.model_copy(deep=True) for guest in guests]
    if filters.theme:
        for guest in pool:
            if guest.idea:
                guest.idea.pitch = f"{guest.idea.pitch} The conversation keeps coming back to {filters.theme}."
    if filters.model_copy(update={"theme": None}) == Filters():
        return pool
    if filters.fame != "any":
        # Leave out the guests whose fans already listen: the household names.
        pool = [g for g in pool if g.scores.reach is None or g.scores.reach >= 0.33]
    if filters.country:
        pool = [g for g in pool if crc32(f"{g.name}|{filters.country.lower()}".encode()) % 3]
    fit = []
    for guest in pool:
        value = guest.scores.fit
        if filters.age:
            value += 0.5 if guest.evidence and filters.age in guest.evidence.ages else -0.2
        if filters.fame == "rising":
            value += 0.5 * (guest.scores.reach or 0)
        fit.append(value)
    fit_pct = scoring.percentiles(fit)
    love_pct = scoring.percentiles([g.scores.love_back for g in pool])
    reach_pct = scoring.percentiles([g.scores.reach for g in pool])
    about = filters.episode_about
    anchor_pct = (
        scoring.percentiles([crc32(f"{g.name}|{about.query.lower()}".encode()) % 100 for g in pool]) if about else None
    )
    for i, guest in enumerate(pool):
        fit_i, love_i, reach_i = fit_pct[i], love_pct[i], reach_pct[i]
        assert fit_i is not None and love_i is not None
        anchor = anchor_pct[i] if anchor_pct else None
        guest.scores.fit, guest.scores.love_back, guest.scores.reach = fit_i, love_i, reach_i
        guest.scores.echo = round(scoring.echo_score(fit_i, love_i, reach_i, anchor), 3)
        guest.label = scoring.label(fit_i, love_i, reach_i)
    # The real engine writes evidence and ideas for its top guests, so those stay on top here.
    pool.sort(key=lambda g: (g.evidence is not None, g.scores.echo), reverse=True)
    for rank, guest in enumerate(pool, start=1):
        guest.ref = f"g{rank}"
    return pool
