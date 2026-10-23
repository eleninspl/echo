"""Run the featured shows' analyses into the configured store and make them the ones /featured lists.

Run from engine/ after each scoring change:  uv run python scripts/warm.py ["show" ...]
Each show is a Qloo show ID, or search text whose first podcast result is used. Without arguments, the shows come
from ECHO_FEATURED (comma-separated, never committed). With the production DATABASE_URL and Upstash variables set,
this fills the deployed engine. Runs are always fresh, so new scoring shows; Qloo answers come from the cache when
they can. /featured only changes when every show finishes.
"""

import argparse
import asyncio
import time
from uuid import UUID

from echo_engine import pipeline
from echo_engine.app import EchoError, Engine, create_app
from echo_engine.config import get_settings
from echo_engine.models import Filters


def is_id(text: str) -> bool:
    try:
        UUID(text)
    except ValueError:
        return False
    return True


async def find_show(engine: Engine, text: str) -> str:
    if is_id(text):
        return text
    async with engine.client() as client:
        shows = await pipeline.search_shows(client, text)
    if not shows:
        raise EchoError(404, "not_found", f"no podcast found for {text!r}")
    others = "; ".join(f"{show.title} ({show.id})" for show in shows[1:])
    print(f"{text!r} is {shows[0].title} ({shows[0].id}). Pass an ID to pick another: {others or 'none'}")
    return shows[0].id


async def warm(engine: Engine, shows: list[str]) -> bool:
    """Runs every show, and makes them the featured ones only if all of them finish."""
    done = []
    for text in shows:
        started = time.monotonic()
        try:
            analysis = await engine.start(await find_show(engine, text), Filters(), reuse=False)
        except EchoError as error:
            print(f"{text!r}: {error.code}: {error.message}")
            continue
        seconds = time.monotonic() - started
        fresh = sum(not call.cached for call in analysis.qloo_calls)
        sweet = sum(guest.label == "sweet_spot" for guest in analysis.guests)
        line = f"{analysis.show.title}: {analysis.status} in {seconds:.0f} s, {fresh} fresh Qloo calls"
        if analysis.status == "done":
            done.append(analysis.id)
            print(f"{line}, {len(analysis.guests)} guests, {sweet} sweet spots, {analysis.id}")
        else:
            print(f"{line}: {analysis.error.error}: {analysis.error.message}")
    if len(done) < len(shows):
        print(f"{len(shows) - len(done)} of {len(shows)} didn't finish: /featured is unchanged.")
        return False
    await engine.analyses.set_featured(done)
    print(f"/featured lists these {len(done)} shows now.")
    return True


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run the featured shows and save them for /featured.")
    parser.add_argument("shows", nargs="*", help="show IDs or search text (default: ECHO_FEATURED)")
    shows = parser.parse_args().shows or get_settings().featured
    if not shows:
        parser.error("pass the shows or set ECHO_FEATURED")
    engine: Engine = create_app(mock=False).state.engine
    try:
        ok = await warm(engine, shows)
    finally:
        await engine.analyses.close()
        await engine.counters.close()
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    asyncio.run(main())
