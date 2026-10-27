import argparse
import asyncio
import json
import re
import time
from typing import Any

from echo_engine import llm, pipeline
from echo_engine.config import get_settings
from echo_engine.models import Analysis, DraftRequest, DraftText, ErrorBody, Filters, Message, Step
from echo_engine.qloo_client import QlooClient
from echo_engine.screen import ETHNICITY, HEALTH, MONEY_TROUBLE, POLITICS, RELIGION, SEXUALITY, has_term

JARGON = re.compile(
    r"\b(over-?index\w*|affinit\w*|skew\w*|audience overlap|overlapping audiences|percentile\w*|audience data|"
    r"data|algorithm\w*|qloo|scor(?:e|es|ed|ing)|metric\w*|demographic\w*|signal\w*)\b",
    re.IGNORECASE,
)
HYPE = re.compile(
    r"\b(incredible|amazing|unforgettable|epic|electrifying|must-listen|mind-blowing|legendary|iconic|ultimate|"
    r"game-chang\w*|delve|leverage|seamless\w*|vibrant|tapestry|testament)\b",
    re.IGNORECASE,
)
PRONOUN = re.compile(r"\b(he|she|his|her|hers|him|himself|herself)\b", re.IGNORECASE)
PREDICTION = re.compile(r"\b(will|are going to|are sure to)\s+(love|enjoy|like|adore|tune in|listen)\b", re.IGNORECASE)
BIRTH = re.compile(r"\bborn\b|\(\s*(?:1[89]|20)\d{2}", re.IGNORECASE)
DIGITS = re.compile(r"\d")
AGE_GROUP = re.compile(r"\b\d+\s*(?:and (?:older|younger)|to \d+|(?:or|and) (?:over|under))\b|\b\d0s\b", re.IGNORECASE)
SENSITIVE = RELIGION | SEXUALITY | ETHNICITY | HEALTH | POLITICS | MONEY_TROUBLE
CHAT_PROBES = [
    ("why_first", "Why is {top} first?", "none"),
    ("rewrite", "Give {third} a funnier idea", "rewrite"),
    ("younger", "Show me guests for younger listeners", "rerun"),
    ("less_famous", "I'd like less famous guests", "rerun"),
    ("about_film", "I want an episode about the movie Dune", "rerun"),
    ("leave_out", "We've had {third} on the show already", "leave_out"),
]


def parse() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Echo end to end on one show and check every text it writes.")
    parser.add_argument("show", help="text to search for")
    parser.add_argument("--pick", type=int, default=0, help="which search result to use (0 is the first)")
    parser.add_argument("--host-name", default="Alex Example")
    parser.add_argument("--note", default="We record on Tuesdays in LA, about an hour.")
    parser.add_argument("--skip-chat", action="store_true")
    return parser.parse_args()


def sentences(text: str) -> int:
    return len([part for part in re.split(r"(?<=[a-z0-9)'\"][.!?])\s+", text.strip()) if part])


def problems(text: str, where: str) -> list[str]:
    found = []
    checks = (("jargon", JARGON), ("hype", HYPE), ("prediction", PREDICTION), ("birth", BIRTH), ("pronoun", PRONOUN))
    for name, pattern in checks:
        if match := pattern.search(text):
            found.append(f"{where}: {name} '{match.group(0)}'")
    if "—" in text or " – " in text:
        found.append(f"{where}: dash")
    if has_term(text, SENSITIVE):
        words = [w for w in re.findall(r"[a-z]+", text.lower()) if w in SENSITIVE or w.rstrip("s") in SENSITIVE]
        found.append(f"{where}: sensitive {sorted(set(words))}")
    return found


def idea_problems(idea: dict[str, str], where: str) -> list[str]:
    found = [p for key in ("reason", "title", "pitch") for p in problems(idea[key], f"{where}.{key}")]
    if len(idea["title"]) > 70:
        found.append(f"{where}.title: {len(idea['title'])} characters")
    if sentences(idea["reason"]) > 2:
        found.append(f"{where}.reason: {sentences(idea['reason'])} sentences")
    if sentences(idea["pitch"]) > 2:
        found.append(f"{where}.pitch: {sentences(idea['pitch'])} sentences")
    for key, limit in (("reason", 35), ("pitch", 45)):
        if (count := len(idea[key].split())) > limit:
            found.append(f"{where}.{key}: {count} words")
    if DIGITS.search(AGE_GROUP.sub("", idea["reason"] + idea["pitch"])):
        found.append(f"{where}: digits")
    return found


def grounded(idea: dict[str, str], evidence: dict[str, Any] | None) -> bool:
    if not evidence:
        return False
    text = " ".join(idea.values()).lower()
    named = evidence["shared_tastes"] + evidence["new_podcasts"]
    return any(name.lower() in text for name in named)


async def timed(work: Any) -> tuple[Any, float]:
    started = time.monotonic()
    result = await work
    return result, round(time.monotonic() - started, 1)


async def analyse(show_query: str, pick: int) -> tuple[Analysis, dict[str, float]]:
    async with QlooClient.from_settings() as client:
        shows = await pipeline.search_shows(client, show_query)
        show = await pipeline.get_show(client, shows[pick].id)
    analysis = Analysis(
        id="an_qa",
        status="running",
        show=show,
        filters=Filters(),
        steps=[Step(key=k, label=label) for k, label in pipeline.STEPS],
    )
    started = time.monotonic()
    marks: dict[str, float] = {}

    async def progress() -> None:
        for step in analysis.steps:
            if step.done and step.key not in marks:
                marks[step.key] = round(time.monotonic() - started, 1)

    async with QlooClient.from_settings() as client:
        try:
            await pipeline.run_analysis(client, analysis, progress)
            analysis.status = "done"
        except pipeline.AnalysisFailed as error:
            analysis.status = "failed"
            analysis.error = ErrorBody(error=error.code, message=error.message)
    return analysis, marks


async def details(analysis: Analysis, refs: list[str]) -> dict[str, Any]:
    guests = {guest.ref: guest for guest in analysis.guests}
    async with QlooClient.from_settings() as client:
        maps = {ref: await pipeline.guest_maps(client, analysis, guests[ref]) for ref in refs}
    episodes = await asyncio.gather(*(timed(llm.write_episode(analysis, guests[ref], maps[ref])) for ref in refs))
    briefing = await timed(llm.write_briefing(analysis, guests[refs[0]], maps[refs[0]]))
    return {"maps": maps, "episodes": dict(zip(refs, episodes, strict=True)), "briefing": briefing}


async def drafts(analysis: Analysis, refs: list[str], host_name: str, note: str) -> dict[str, Any]:
    guests = [guest for guest in analysis.guests if guest.ref in refs]
    request = DraftRequest(analysis_id=analysis.id, guest_refs=refs, host_name=host_name, note=note)
    written, seconds = await timed(llm.write_drafts(analysis, guests, request))
    first = written[0]
    revise = DraftRequest(
        analysis_id=analysis.id,
        guest_refs=[first.guest_ref],
        host_name=host_name,
        note=note,
        previous=DraftText(subject=first.subject, body=first.body),
        instruction="Much shorter, and less formal.",
    )
    revised, revised_seconds = await timed(
        llm.write_drafts(analysis, [g for g in guests if g.ref == first.guest_ref], revise)
    )
    return {"drafts": (written, seconds), "revised": (revised[0], revised_seconds)}


async def chats(analysis: Analysis) -> list[dict[str, Any]]:
    names = {"top": analysis.guests[0].name, "third": analysis.guests[2].name}

    async def probe(key: str, text: str, expected: str) -> dict[str, Any]:
        message = text.format(**names)
        decision, seconds = await timed(llm.chat(analysis, [Message(role="user", content=message)]))
        return {"key": key, "message": message, "expected": expected, "decision": decision, "seconds": seconds}

    return list(await asyncio.gather(*(probe(*item) for item in CHAT_PROBES)))


def chat_problems(result: dict[str, Any], analysis: Analysis) -> list[str]:
    decision, key = result["decision"], result["key"]
    found = problems(decision.reply, f"chat.{key}.reply")
    if decision.action != result["expected"]:
        found.append(f"chat.{key}: action {decision.action}, expected {result['expected']}")
    if key == "rewrite" and decision.action == "rewrite":
        if decision.guest_ref != analysis.guests[2].ref:
            found.append(f"chat.rewrite: rewrote {decision.guest_ref}, expected {analysis.guests[2].ref}")
        if decision.idea:
            found += idea_problems(decision.idea.model_dump(), "chat.rewrite.idea")
    filters = decision.filters
    if key == "younger" and filters and filters.age not in ("24_and_younger", "25_to_29"):
        found.append(f"chat.younger: age {filters.age}")
    if key == "less_famous" and filters and filters.fame == "any":
        found.append("chat.less_famous: fame stayed any")
    if key == "about_film" and filters and not (filters.episode_about and filters.episode_about.type == "movie"):
        found.append(f"chat.about_film: {filters.episode_about}")
    if filters and key != "younger" and filters.age:
        found.append(f"chat.{key}: set an age it wasn't asked for")
    return found


def report(analysis: Analysis, marks: dict[str, float], extra: dict[str, Any]) -> list[str]:
    print(f"\n=== {analysis.show.title}  [{analysis.status}]  steps {marks}")
    found: list[str] = []
    print("  left out: " + ", ".join(f"{o.name} ({o.why})" for o in analysis.left_out))
    for guest in analysis.guests:
        e = guest.evidence
        print(f"  {guest.ref:<4}{guest.name[:26]:<27}{guest.label:<11}{guest.scores.echo:.2f}  {guest.description}")
        if e:
            print(f"       shared {e.shared_tastes} / new {e.new_podcasts} / ages {e.ages}")
        if guest.description and BIRTH.search(guest.description):
            found.append(f"{guest.ref}.description: birth")
        if guest.idea:
            idea = guest.idea.model_dump()
            print(f"       {idea['title']}\n       reason: {idea['reason']}\n       pitch: {idea['pitch']}")
            found += idea_problems(idea, f"{guest.ref}.idea")
            if not grounded(idea, e.model_dump() if e else None):
                found.append(f"{guest.ref}.idea: names none of its evidence")
    titles = [g.idea.title for g in analysis.guests if g.idea]
    if len(set(titles)) != len(titles):
        found.append("ideas: repeated titles")
    for ref, (episode, seconds) in extra.get("episodes", {}).items():
        print(f"\n  episode {ref} ({seconds}s): {episode.title}\n    {episode.summary}")
        for segment in episode.segments:
            print(f"    - {segment.title}: {' | '.join(segment.points)}")
        for question in episode.questions:
            print(f"    ? {question}")
        text = " ".join([episode.title, episode.summary, *episode.questions] + [s.title for s in episode.segments])
        found += problems(text + " " + " ".join(p for s in episode.segments for p in s.points), f"episode.{ref}")
    if "briefing" in extra:
        markdown, seconds = extra["briefing"]
        print(f"\n  briefing ({seconds}s):\n" + "\n".join(f"    {line}" for line in markdown.splitlines()))
        found += problems(markdown, "briefing")
    if "drafts" in extra:
        written, seconds = extra["drafts"]
        for draft in written:
            words = len(draft.body.split())
            print(f"\n  draft {draft.guest_ref} ({seconds}s, {words} words): {draft.subject}\n    {draft.body}")
            found += problems(draft.subject + " " + draft.body, f"draft.{draft.guest_ref}")
            if not 90 <= words <= 175:
                found.append(f"draft.{draft.guest_ref}: {words} words")
        revised, seconds = extra["revised"]
        words = len(revised.body.split())
        print(f"\n  revised ({seconds}s, {words} words): {revised.subject}\n    {revised.body}")
        found += problems(revised.body, "draft.revised")
        if words >= len(written[0].body.split()):
            found.append("draft.revised: not shorter")
    for result in extra.get("chats", []):
        decision = result["decision"]
        print(f"\n  chat {result['key']} ({result['seconds']}s): {result['message']}")
        print(f"    -> {decision.action}: {decision.reply}")
        if decision.filters:
            print(f"    filters {decision.filters.model_dump(exclude_none=True)}")
        if decision.idea:
            print(f"    idea {decision.guest_ref}: {decision.idea.model_dump()}")
        found += chat_problems(result, analysis)
    print(f"\n  {len(found)} problems")
    for item in found:
        print(f"   ! {item}")
    return found


def dumped(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, dict):
        return {key: dumped(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [dumped(item) for item in value]
    return value


async def main() -> None:
    args = parse()
    analysis, marks = await analyse(args.show, args.pick)
    extra: dict[str, Any] = {}
    if analysis.status == "done" and len(analysis.guests) >= 3:
        refs = [analysis.guests[0].ref, analysis.guests[1].ref]
        jobs = [details(analysis, refs), drafts(analysis, refs, args.host_name, args.note)]
        if not args.skip_chat:
            jobs.append(chats(analysis))
        results = await asyncio.gather(*jobs)
        extra = {**results[0], **results[1], "chats": results[2] if len(results) > 2 else []}
    found = report(analysis, marks, extra)
    out = get_settings().cache_dir / "qa"
    out.mkdir(parents=True, exist_ok=True)
    slug = "".join(ch if ch.isalnum() else "_" for ch in analysis.show.title.lower())[:40]
    record = {"analysis": analysis.model_dump(), "marks": marks, "extra": dumped(extra), "problems": found}
    (out / f"{slug}.json").write_text(json.dumps(record, indent=1, default=str))
    print(f"\n  saved to {out / slug}.json (private, never commit)")


if __name__ == "__main__":
    asyncio.run(main())
