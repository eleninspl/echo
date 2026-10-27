"""What the LLM writes for one guest of an analysis (the episode, the briefing), kept so that opening the guest again
doesn't write it again. Analyses are shared between visitors, and neither of these depends on who asks. Drafts depend
on the host (their name, their notes) and are never kept here."""

import hashlib
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from .models import Analysis, Guest
from .store import Cache, DiskCache, response_cache

Kind = Literal["episode", "briefing"]

# As long as anyone could open the analysis again during the hackathon and its judging.
TTL_SECONDS = 120 * 24 * 3600


def writings_cache(store: Path | None) -> Cache:
    """Files next to a local store's folder, else Postgres when DATABASE_URL is set, else .cache/writings."""
    if store is not None:
        return DiskCache(store.parent / "writings", TTL_SECONDS)
    return response_cache("writings", TTL_SECONDS)


class Writings:
    """Keyed by analysis, guest, the guest's idea and the episode length: a rewritten idea gets a new episode and
    briefing, and so does a new length."""

    def __init__(self, cache: Cache | None) -> None:
        self.cache = cache

    @staticmethod
    def key(analysis: Analysis, guest: Guest, kind: Kind, length: str | None = None) -> str:
        idea = guest.idea.model_dump_json() if guest.idea else ""
        if length:
            idea = f"{idea}\n{length.lower()}"
        return f"{analysis.id}.{guest.ref}.{kind}.{hashlib.sha256(idea.encode()).hexdigest()[:12]}"

    async def get[T: BaseModel](
        self, analysis: Analysis, guest: Guest, kind: Kind, model: type[T], length: str | None = None
    ) -> T | None:
        if self.cache is None:
            return None
        saved = await self.cache.get(self.key(analysis, guest, kind, length))
        return None if saved is None else model.model_validate(saved)

    async def put(
        self, analysis: Analysis, guest: Guest, kind: Kind, value: BaseModel, length: str | None = None
    ) -> None:
        if self.cache is not None:
            key = self.key(analysis, guest, kind, length)
            await self.cache.set(key, kind, {"analysis": analysis.id, "ref": guest.ref}, value.model_dump())
