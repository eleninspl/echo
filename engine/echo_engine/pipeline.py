from .models import Analysis, Guest, GuestMaps, Show
from .qloo_client import QlooClient

STEPS = [
    ("map", "Mapping your audience"),
    ("candidates", "Finding guests"),
    ("clean", "Removing hosts and past guests"),
    ("score", "Scoring love back and reach"),
    ("evidence", "Collecting the evidence"),
    ("ideas", "Writing episode ideas"),
]


async def search_shows(client: QlooClient, q: str) -> list[Show]:
    raise NotImplementedError("Q2: podcast search")


async def get_show(client: QlooClient, show_id: str) -> Show:
    raise NotImplementedError("Q2: show lookup")


async def run_analysis(client: QlooClient, analysis: Analysis) -> None:
    raise NotImplementedError("Q3 to Q7: the analysis")


async def guest_maps(client: QlooClient, analysis: Analysis, guest: Guest) -> GuestMaps:
    raise NotImplementedError("Q8: guest audience map")
