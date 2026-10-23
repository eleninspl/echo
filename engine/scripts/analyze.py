import argparse
import asyncio
import json
import time
from statistics import fmean

from echo_engine import pipeline
from echo_engine.config import get_settings
from echo_engine.models import Analysis, EpisodeAbout, ErrorBody, Filters, QlooCall, Step
from echo_engine.qloo_client import QlooClient
from echo_engine.store import qloo_counters


def parse() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Echo's Qloo pipeline on one show and print the result.")
    parser.add_argument("show", help="text to search for")
    parser.add_argument("--pick", type=int, default=0, help="which search result to use (0 is the first)")
    parser.add_argument("--fame", default="any", choices=["any", "less_famous", "rising"])
    parser.add_argument("--age")
    parser.add_argument("--country")
    parser.add_argument("--about", help="episode about, as query:type, for example 'Dune:movie'")
    return parser.parse_args()


def filters_of(args: argparse.Namespace) -> Filters:
    about = None
    if args.about:
        query, _, kind = args.about.rpartition(":")
        about = EpisodeAbout(query=query, type=kind)
    return Filters(fame=args.fame, age=args.age, country=args.country, episode_about=about)


def report(analysis: Analysis, seconds: float, month_left: int | None) -> None:
    calls = analysis.qloo_calls
    fresh = [c for c in calls if not c.cached]
    print(f"\n{analysis.show.title}  [{analysis.status}]  {analysis.filters.model_dump(exclude_none=True)}")
    print(f"{len(calls)} Qloo calls, {len(fresh)} fresh, {seconds:.1f}s, month left {month_left}")
    if analysis.error:
        print("ERROR", analysis.error.error, analysis.error.message)
        return
    for row in analysis.audience_map:
        print(f"  {row.category:<9} " + ", ".join(item.name for item in row.items[:4]))
    print("  left out: " + ", ".join(f"{o.name} ({o.why})" for o in analysis.left_out))
    labels = [g.label for g in analysis.guests]
    print("  labels: " + ", ".join(f"{label} {labels.count(label)}" for label in sorted(set(labels))))
    header = f"{'#':<4}{'name':<28}{'label':<11}{'fit':>6}{'love':>6}{'reach':>6}{'echo':>6}"
    print(f"\n  {header}  shared / new podcasts / ages")
    for guest in analysis.guests:
        s = guest.scores
        reach = "  -  " if s.reach is None else f"{s.reach:>6.2f}"
        scores = f"{s.fit:>6.2f}{s.love_back:>6.2f}{reach}{s.echo:>6.2f}"
        line = f"  {guest.ref:<4}{guest.name[:27]:<28}{guest.label:<11}{scores}"
        if guest.evidence:
            e = guest.evidence
            line += f"  {', '.join(e.shared_tastes[:3])} / {', '.join(e.new_podcasts[:2])} / {', '.join(e.ages)}"
        print(line)
    print(f"\n  mean echo {fmean(g.scores.echo for g in analysis.guests):.2f}")


async def main() -> None:
    args = parse()
    async with QlooClient.from_settings() as client:
        shows = await pipeline.search_shows(client, args.show)
        print("search:", [s.title for s in shows])
        show = await pipeline.get_show(client, shows[args.pick].id)
    analysis = Analysis(
        id="an_local",
        status="running",
        show=show,
        filters=filters_of(args),
        steps=[Step(key=k, label=label) for k, label in pipeline.STEPS],
    )
    started = time.monotonic()
    async with QlooClient.from_settings() as client:
        try:
            await pipeline.run_analysis(client, analysis)
            analysis.status = "done"
        except pipeline.AnalysisFailed as error:
            analysis.status = "failed"
            analysis.error = ErrorBody(error=error.code, message=error.message)
        analysis.qloo_calls = [QlooCall.model_validate(c.to_dict()) for c in client.log]
    report(analysis, time.monotonic() - started, await qloo_counters().month_left())
    out = get_settings().cache_dir / "runs"
    out.mkdir(parents=True, exist_ok=True)
    slug = "".join(ch if ch.isalnum() else "_" for ch in show.title.lower())[:40]
    (out / f"{slug}.json").write_text(json.dumps(analysis.model_dump(), indent=1))
    print(f"\n  saved to {out / slug}.json (private, never commit)")


if __name__ == "__main__":
    asyncio.run(main())
