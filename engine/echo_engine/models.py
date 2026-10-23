from typing import Literal

from pydantic import BaseModel, Field, model_validator

Fame = Literal["any", "less_famous", "rising"]
AgeBucket = Literal["24_and_younger", "25_to_29", "30_to_34", "35_to_44", "45_to_54", "55_and_older"]
AnchorType = Literal["movie", "tv_show", "artist", "brand", "videogame"]
Label = Literal["sweet_spot", "safe", "far", "long_shot", "balanced"]
Status = Literal["running", "done", "failed"]


class Show(BaseModel):
    id: str
    title: str
    description: str | None = None
    image_url: str | None = None


class ShowList(BaseModel):
    shows: list[Show]


class EpisodeAbout(BaseModel):
    query: str = Field(min_length=1, max_length=100)
    type: AnchorType
    used: str | None = None


class Filters(BaseModel):
    fame: Fame = "any"
    age: AgeBucket | None = None
    country: str | None = Field(default=None, min_length=2, max_length=60)
    episode_about: EpisodeAbout | None = None


class Step(BaseModel):
    key: str
    label: str
    done: bool = False


class MapItem(BaseModel):
    name: str
    image_url: str | None = None
    affinity: float


class MapRow(BaseModel):
    category: str
    items: list[MapItem]


class Scores(BaseModel):
    fit: float
    love_back: float
    reach: float | None
    echo: float


class Evidence(BaseModel):
    shared_tastes: list[str] = []
    new_podcasts: list[str] = []
    ages: list[AgeBucket] = []


class Idea(BaseModel):
    reason: str
    title: str
    pitch: str


class Guest(BaseModel):
    ref: str
    name: str
    description: str | None = None
    image_url: str | None = None
    links: dict[str, str] = {}
    label: Label
    scores: Scores
    evidence: Evidence | None = None
    idea: Idea | None = None


class LeftOut(BaseModel):
    name: str
    why: Literal["host", "past_guest"]


class QlooCall(BaseModel):
    path: str
    params: dict[str, str]
    status: int
    duration_ms: int
    cached: bool
    at: str


class ErrorBody(BaseModel):
    error: str
    message: str


class Analysis(BaseModel):
    id: str
    status: Status
    show: Show
    filters: Filters
    steps: list[Step]
    audience_map: list[MapRow] = []
    guests: list[Guest] = []
    left_out: list[LeftOut] = []
    qloo_calls: list[QlooCall] = []
    error: ErrorBody | None = None


class AnalysisRequest(BaseModel):
    show_id: str = Field(min_length=1, max_length=64)
    filters: Filters = Filters()


class AnalysisStarted(BaseModel):
    id: str
    status: Status


class Featured(BaseModel):
    show: Show
    analysis_id: str


class FeaturedList(BaseModel):
    featured: list[Featured]


class Person(BaseModel):
    id: str
    name: str
    description: str | None = None


class GuestMaps(BaseModel):
    audience_map: list[MapRow]
    adds: list[MapRow]


class Segment(BaseModel):
    title: str
    points: list[str]


class Episode(BaseModel):
    title: str
    summary: str
    segments: list[Segment]
    questions: list[str]


class GuestDetails(GuestMaps):
    ref: str
    episode: Episode


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    analysis_id: str
    messages: list[Message] = Field(min_length=1, max_length=20)


class ChatDecision(BaseModel):
    reply: str
    action: Literal["rerun", "rewrite", "none"]
    filters: Filters | None = None
    guest_ref: str | None = None
    idea: Idea | None = None


class ChatReply(BaseModel):
    reply: str
    action: Literal["rerun", "rewrite", "none"]
    analysis_id: str | None = None
    guest_ref: str | None = None
    idea: Idea | None = None


class DraftText(BaseModel):
    subject: str
    body: str


class DraftRequest(BaseModel):
    analysis_id: str
    guest_refs: list[str] = Field(min_length=1, max_length=5)
    host_name: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=500)
    previous: DraftText | None = None
    instruction: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def revise_one_at_a_time(self) -> "DraftRequest":
        if (self.previous is None) != (self.instruction is None):
            raise ValueError("previous and instruction go together")
        if self.previous is not None and len(self.guest_refs) != 1:
            raise ValueError("revise one draft at a time")
        return self


class Draft(DraftText):
    guest_ref: str


class DraftList(BaseModel):
    drafts: list[Draft]


class BriefingRequest(BaseModel):
    analysis_id: str
    guest_ref: str


class Briefing(BaseModel):
    markdown: str


class Health(BaseModel):
    ok: bool
    mock: bool
    qloo_calls_today: int = 0
    qloo_calls_left: int | None = None
