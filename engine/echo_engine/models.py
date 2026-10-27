from typing import Annotated, ClassVar, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Fame = Literal["any", "less_famous", "rising"]
AgeBucket = Literal["24_and_younger", "25_to_29", "30_to_34", "35_to_44", "45_to_54", "55_and_older"]
AnchorType = Literal["movie", "tv_show", "artist", "brand", "videogame"]
Label = Literal["sweet_spot", "safe", "far", "long_shot", "balanced"]
Status = Literal["running", "done", "failed"]
THEME_LENGTH = 120


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
    # Free text for the LLM only (ideas, the episode, drafts, the briefing). Qloo never sees it.
    theme: str | None = Field(default=None, max_length=THEME_LENGTH)

    @field_validator("theme", mode="before")
    @classmethod
    def blank_theme_is_none(cls, value: object) -> object:
        if isinstance(value, str):
            value = " ".join(value.split())
            return value or None
        return value


class Step(BaseModel):
    key: str
    label: str
    done: bool = False


class MapItem(BaseModel):
    name: str
    image_url: str | None = None
    affinity: float
    id: str | None = None


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


class RewrittenIdea(Idea):
    """An idea the chat rewrote, sent back by the web app, which keeps it: the analysis is shared, so it isn't saved."""

    reason: str = Field(min_length=1, max_length=1000)
    title: str = Field(min_length=1, max_length=200)
    pitch: str = Field(min_length=1, max_length=1000)


class Guest(BaseModel):
    ref: str
    id: str
    name: str
    description: str | None = None
    # A few plain sentences built in code from the person's public facts (pipeline.bio_of). None when there's
    # nothing beyond the description.
    bio: str | None = None
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
    version: int = 0


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


class BridgeCount(BaseModel):
    both: int
    yours: int
    theirs: int


class GuestBridge(BaseModel):
    ref: str
    both: list[MapRow]
    yours: list[MapRow]
    theirs: list[MapRow]
    totals: dict[str, BridgeCount] = {}


class MapLens(BaseModel):
    age: AgeBucket | None = None
    country: str | None = None
    audience_map: list[MapRow]


class TasteFan(BaseModel):
    ref: str
    affinity: float


class TasteFans(BaseModel):
    category: str
    name: str
    guests: list[TasteFan]


class TasteAsk(BaseModel):
    category: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=300)
    age: AgeBucket | None = None
    country: str | None = Field(default=None, min_length=2, max_length=60)


class MapFocus(BaseModel):
    category: str | None = None
    tastes: list[str] = []
    age: AgeBucket | None = None
    country: str | None = Field(default=None, min_length=2, max_length=60)


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
    episode: Episode | None = None


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    analysis_id: str
    messages: list[Message] = Field(min_length=1, max_length=20)
    taste: TasteAsk | None = None


class ChatDecision(BaseModel):
    reply: str
    action: Literal["rerun", "rewrite", "none"]
    filters: Filters | None = None
    guest_ref: str | None = None
    idea: Idea | None = None
    map: MapFocus | None = None
    guest_refs: list[str] = []


class ChatReply(BaseModel):
    reply: str
    action: Literal["rerun", "rewrite", "none"]
    analysis_id: str | None = None
    guest_ref: str | None = None
    idea: Idea | None = None
    map: MapFocus | None = None
    guest_refs: list[str] = []


class DraftText(BaseModel):
    subject: str
    body: str


class InviteDetails(BaseModel):
    """The practical side of an invitation, every field optional. Kept in the host's browser, sent with each draft."""

    dates: str | None = Field(default=None, max_length=80)
    fee: str | None = Field(default=None, max_length=40)
    unpaid: bool = False
    format: Literal["in_person", "remote"] | None = None
    place: str | None = Field(default=None, max_length=80)
    length: str | None = Field(default=None, max_length=30)
    release: str | None = Field(default=None, max_length=40)
    reply_by: str | None = Field(default=None, max_length=40)

    # A guest's own details replace the shared ones a group at a time: a fee replaces "unpaid", a place the format.
    GROUPS: ClassVar[tuple[tuple[str, ...], ...]] = (
        ("dates",),
        ("fee", "unpaid"),
        ("format", "place"),
        ("length",),
        ("release",),
        ("reply_by",),
    )

    @field_validator("dates", "fee", "place", "length", "release", "reply_by", mode="before")
    @classmethod
    def blank_is_none(cls, value: object) -> object:
        if isinstance(value, str):
            return " ".join(value.split()) or None
        return value

    @model_validator(mode="after")
    def consistent(self) -> "InviteDetails":
        if self.unpaid:
            self.fee = None
        if self.format == "remote":
            self.place = None
        return self

    def given(self, fields: tuple[str, ...]) -> bool:
        return any(getattr(self, field) not in (None, False) for field in fields)

    @property
    def empty(self) -> bool:
        return not any(self.given(group) for group in self.GROUPS)

    def with_own(self, own: "InviteDetails | None") -> "InviteDetails":
        if own is None:
            return self
        values = self.model_dump()
        for group in self.GROUPS:
            if own.given(group):
                values.update({field: getattr(own, field) for field in group})
        return InviteDetails.model_validate(values)

    def plainly(self) -> dict[str, str]:
        """The details given, in words, for the prompt and the mock."""
        where = {"remote": "remote", "in_person": "in person"}.get(self.format or "", "")
        if self.place:
            where = f"in person, at {self.place}"
        words = {
            "recording_dates": self.dates,
            "fee": "unpaid" if self.unpaid else self.fee,
            "format": where,
            "episode_length": self.length,
            "release": self.release,
            "reply_by": self.reply_by,
        }
        return {key: value for key, value in words.items() if value}


class DraftRequest(BaseModel):
    analysis_id: str
    guest_refs: list[str] = Field(min_length=1, max_length=5)
    host_name: str | None = Field(default=None, max_length=80)
    # `note` and `details` go to every guest in the request; `notes` and `details_by_ref` to one guest each, by ref.
    # A guest's own details override the shared ones.
    note: str | None = Field(default=None, max_length=500)
    notes: dict[str, Annotated[str, Field(max_length=300)]] = {}
    details: InviteDetails = InviteDetails()
    details_by_ref: dict[str, InviteDetails] = {}
    # A guest's idea as the chat rewrote it, in place of the analysis's own.
    ideas: dict[str, RewrittenIdea] = {}
    previous: DraftText | None = None
    instruction: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def revise_one_at_a_time(self) -> "DraftRequest":
        if (self.previous is None) != (self.instruction is None):
            raise ValueError("previous and instruction go together")
        if self.previous is not None and len(self.guest_refs) != 1:
            raise ValueError("revise one draft at a time")
        if set(self.notes) - set(self.guest_refs):
            raise ValueError("a note is for a guest who isn't in guest_refs")
        if set(self.details_by_ref) - set(self.guest_refs):
            raise ValueError("details are for a guest who isn't in guest_refs")
        if set(self.ideas) - set(self.guest_refs):
            raise ValueError("an idea is for a guest who isn't in guest_refs")
        self.notes = {ref: note.strip() for ref, note in self.notes.items() if note.strip()}
        self.details_by_ref = {ref: own for ref, own in self.details_by_ref.items() if not own.empty}
        return self

    def details_for(self, ref: str) -> InviteDetails:
        return self.details.with_own(self.details_by_ref.get(ref))


class Draft(DraftText):
    guest_ref: str


class DraftList(BaseModel):
    drafts: list[Draft]


class BriefingRequest(BaseModel):
    analysis_id: str
    guest_ref: str
    idea: RewrittenIdea | None = None


class Briefing(BaseModel):
    markdown: str


class Health(BaseModel):
    ok: bool
    mock: bool
    qloo_calls_today: int = 0
    qloo_calls_left: int | None = None
