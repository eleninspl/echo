from .models import Analysis, ChatDecision, Draft, DraftRequest, Episode, Guest, GuestMaps, Idea, Message, Person, Show


async def find_hosts(show: Show, people: list[Person]) -> set[str]:
    raise NotImplementedError("L1: host check")


async def write_ideas(analysis: Analysis) -> dict[str, Idea]:
    raise NotImplementedError("L2: ideas for the top 10")


async def write_episode(analysis: Analysis, guest: Guest, maps: GuestMaps) -> Episode:
    raise NotImplementedError("L3: full episode idea")


async def chat(analysis: Analysis, messages: list[Message]) -> ChatDecision:
    raise NotImplementedError("L4: chat")


async def write_drafts(analysis: Analysis, guests: list[Guest], request: DraftRequest) -> list[Draft]:
    raise NotImplementedError("L5: invitation drafts")


async def write_briefing(analysis: Analysis, guest: Guest, maps: GuestMaps) -> str:
    raise NotImplementedError("L6: briefing")


async def past_guest_names(show: Show, itunes_id: str) -> list[str]:
    raise NotImplementedError("L7: past guests")
