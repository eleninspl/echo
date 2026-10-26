import asyncio
import json
import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from importlib import resources
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import llm, pipeline
from . import mock as mocked
from .config import get_settings
from .llm_client import LlmError
from .models import (
    Analysis,
    AnalysisRequest,
    AnalysisStarted,
    Briefing,
    BriefingRequest,
    ChatReply,
    ChatRequest,
    Draft,
    DraftList,
    DraftRequest,
    ErrorBody,
    Featured,
    FeaturedList,
    Filters,
    Guest,
    GuestDetails,
    GuestMaps,
    Health,
    QlooCall,
    Show,
    ShowList,
    Step,
)
from .qloo_client import QlooClient, QlooError
from .store import AnalysisStore, Counters, LocalCounters, LocalStore, analysis_store, qloo_counters, request_key

log = logging.getLogger("echo.app")
# httpx logs every request at INFO: on Vercel about 150 lines a run, mostly Upstash. Qloo calls are in each analysis.
logging.getLogger("httpx").setLevel(logging.WARNING)
ClientFactory = Callable[..., QlooClient]


class EchoError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def load_example() -> dict[str, Any]:
    return json.loads(resources.files("echo_engine").joinpath("fixtures/example.json").read_text())


def daily_cap() -> EchoError:
    return EchoError(429, "daily_cap", "Echo has reached today's limit. Featured shows still open.")


class Engine:
    def __init__(
        self,
        mock: bool,
        step_delay: float,
        client_factory: ClientFactory,
        analyses: AnalysisStore,
        counters: Counters,
        daily_cap: int,
    ) -> None:
        self.mock = mock
        self.step_delay = step_delay
        self.client_factory = client_factory
        self.analyses = analyses
        self.counters = counters
        self.daily_cap = daily_cap
        self.example = load_example()
        # Invented shows that fail or stall the way a real run can, for the web app to show each case. Mock only.
        self.failures = {failure["show"]["id"]: failure for failure in self.example["mock_failures"]}
        if mock and isinstance(analyses, LocalStore):
            analyses.remember(Analysis.model_validate(self.example["analysis"]))

    @asynccontextmanager
    async def client(self) -> AsyncIterator[QlooClient]:
        """A Qloo client that counts fresh calls and stops at the daily cap. Cached calls still work."""
        async with self.client_factory(before_fetch=self.take_call, counters=self.counters) as client:
            try:
                yield client
            finally:
                await self.counters.save()

    async def get(self, analysis_id: str) -> Analysis:
        analysis = await self.analyses.get(analysis_id)
        if analysis is None:
            raise EchoError(404, "not_found", "There's no analysis with that ID.")
        return analysis

    async def done(self, analysis_id: str) -> Analysis:
        analysis = await self.get(analysis_id)
        if analysis.status != "done":
            raise EchoError(400, "bad_request", "That analysis hasn't finished.")
        return analysis

    @staticmethod
    def guest(analysis: Analysis, ref: str) -> Guest:
        for guest in analysis.guests:
            if guest.ref == ref:
                return guest
        raise EchoError(404, "not_found", "There's no guest with that ref in this analysis.")

    async def check_cap(self) -> None:
        if not self.mock and await self.counters.calls_today() >= self.daily_cap:
            raise daily_cap()

    async def take_call(self) -> None:
        """The client's before_fetch hook: counts the fresh call it's about to make, or refuses it at the cap."""
        if not await self.counters.take_call(self.daily_cap):
            raise daily_cap()

    def mock_shows(self, q: str) -> list[Show]:
        """The failing shows whose title has `q` in it, up to 5, or else the example shows."""
        failing = [f["show"] for f in self.failures.values() if q.lower() in f["show"]["title"].lower()]
        return [Show.model_validate(show) for show in (failing[:5] or self.example["shows"])]

    def mock_fails(self, show_id: str, at: str) -> None:
        """Raises the error a failing example show stands for, if it fails `at` this point."""
        failure = self.failures.get(show_id, {})
        if self.mock and failure.get("at") == at:
            raise EchoError(failure["status"], failure["error"], failure["message"])

    async def show(self, show_id: str) -> Show:
        if self.mock:
            for show in [*self.example["shows"], *(f["show"] for f in self.failures.values())]:
                if show["id"] == show_id:
                    return Show.model_validate(show)
            raise EchoError(404, "not_found", "There's no show with that ID.")
        try:
            async with self.client() as client:
                return await pipeline.get_show(client, show_id)
        except pipeline.ShowNotFound:
            raise EchoError(404, "not_found", "There's no show with that ID.") from None

    async def start(
        self, show_id: str, filters: Filters, tasks: BackgroundTasks | None = None, reuse: bool = True
    ) -> Analysis:
        """Runs in `tasks` when given, else before returning. With `reuse`, the same show and filters return the
        earlier running or finished analysis."""
        reuse = reuse and not self.mock
        if reuse and (existing := await self.analyses.find(request_key(show_id, filters))):
            return existing
        await self.check_cap()
        show = await self.show(show_id)
        self.mock_fails(show.id, "start")
        if reuse and (existing := await self.analyses.find(request_key(show.id, filters))):
            return existing
        analysis = Analysis(
            id=f"an_{uuid4().hex[:12]}",
            status="running",
            show=show,
            filters=filters,
            steps=[Step(key=key, label=label) for key, label in pipeline.STEPS],
        )
        await self.analyses.put(analysis)
        runner = self.run_mock if self.mock else self.run
        if tasks is None:
            await runner(analysis)
        else:
            tasks.add_task(runner, analysis)
        return analysis

    async def run(self, analysis: Analysis) -> None:
        try:
            async with self.client() as client:
                try:
                    await pipeline.run_analysis(client, analysis, lambda: self.analyses.put(analysis))
                finally:
                    analysis.qloo_calls = [QlooCall.model_validate(record.to_dict()) for record in client.log]
            analysis.status = "done"
        except (pipeline.AnalysisFailed, EchoError) as error:
            fail(analysis, error.code, error.message)
        except QlooError:
            log.exception("Qloo failed during %s", analysis.id)
            fail(analysis, "qloo_error", "Echo's taste data didn't answer. Try again in a minute.")
        except NotImplementedError:
            fail(analysis, "not_implemented", "This part of the engine isn't built yet.")
        except Exception:
            log.exception("analysis %s failed", analysis.id)
            fail(analysis, "engine_error", "Something went wrong in Echo. Try again.")
        await self.analyses.put(analysis)

    async def run_mock(self, analysis: Analysis) -> None:
        """The example's analysis, or the failure or delay a failing example show stands for."""
        failure = self.failures.get(analysis.show.id, {})
        delay = failure["seconds"] / len(analysis.steps) if "seconds" in failure else self.step_delay
        for step in analysis.steps:
            if step.key == failure.get("at"):
                fail(analysis, failure["error"], failure["message"])
                await self.analyses.put(analysis)
                return
            await asyncio.sleep(delay)
            step.done = True
        example = Analysis.model_validate(self.example["analysis"])
        guests = mocked.guests_for(example.guests, analysis.filters)
        if len(guests) < mocked.MIN_GUESTS:
            fail(analysis, "filters_too_narrow", "No guests match those filters. Try a broader one.")
            await self.analyses.put(analysis)
            return
        analysis.audience_map = example.audience_map
        analysis.guests = guests
        analysis.left_out = example.left_out
        analysis.qloo_calls = example.qloo_calls
        if analysis.filters.episode_about:
            analysis.filters.episode_about.used = analysis.filters.episode_about.query
        analysis.status = "done"
        await self.analyses.put(analysis)

    async def guest_maps(self, analysis: Analysis, guest: Guest) -> GuestMaps:
        if self.mock:
            return GuestMaps.model_validate(self.example["guest_details"])
        async with self.client() as client:
            return await pipeline.guest_maps(client, analysis, guest)


def fail(analysis: Analysis, code: str, message: str) -> None:
    analysis.status = "failed"
    analysis.error = ErrorBody(error=code, message=message)


def fill(template: str, analysis: Analysis, guest: Guest, host_name: str | None = None) -> str:
    return template.format(name=guest.name, show=analysis.show.title, host=host_name or "")


def create_app(
    mock: bool | None = None,
    step_delay: float = 0.6,
    client_factory: ClientFactory = QlooClient.from_settings,
    store: Path | AnalysisStore | None = None,
    daily_cap: int | None = None,
    counters: Counters | None = None,
) -> FastAPI:
    """`store` is a folder for local files or a ready store; by default Postgres when DATABASE_URL is set. With a
    folder, today's count goes next to it; otherwise `counters` are Redis when the Upstash variables are set."""
    settings = get_settings()
    mock = settings.mock if mock is None else mock
    if settings.on_vercel and not mock and (missing := settings.missing_on_vercel()):
        raise RuntimeError(f"Set {', '.join(missing)} on the Vercel project, or ECHO_MOCK=1 for the example data")
    if mock:
        analyses: AnalysisStore = LocalStore(None)
    elif isinstance(store, Path):
        analyses = LocalStore(store)
    else:
        analyses = store or analysis_store(settings.cache_dir / "analyses")
    if counters is None:
        if mock:
            counters = LocalCounters(None)
        elif isinstance(store, Path):
            counters = LocalCounters(store.parent / "usage.json")
        else:
            counters = qloo_counters()
    engine = Engine(
        mock,
        step_delay,
        client_factory,
        analyses,
        counters,
        settings.daily_qloo_calls if daily_cap is None else daily_cap,
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        await analyses.close()
        await engine.counters.close()

    app = FastAPI(title="Echo engine", version="1", lifespan=lifespan)
    app.state.engine = engine
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.web_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(EchoError)
    async def echo_error(_: Request, error: EchoError) -> JSONResponse:
        return JSONResponse({"error": error.code, "message": error.message}, status_code=error.status)

    @app.exception_handler(RequestValidationError)
    async def bad_request(_: Request, error: RequestValidationError) -> JSONResponse:
        problem = error.errors()[0]
        field = ".".join(str(part) for part in problem["loc"] if part != "body")
        return JSONResponse({"error": "bad_request", "message": f"{field}: {problem['msg']}"}, status_code=400)

    @app.exception_handler(QlooError)
    async def qloo_error(_: Request, error: QlooError) -> JSONResponse:
        return JSONResponse(
            {"error": "qloo_error", "message": "Echo's taste data didn't answer. Try again in a minute."}, 502
        )

    @app.exception_handler(NotImplementedError)
    async def not_implemented(_: Request, error: NotImplementedError) -> JSONResponse:
        return JSONResponse({"error": "not_implemented", "message": str(error) or "Not built yet."}, 501)

    @app.exception_handler(LlmError)
    async def llm_error(_: Request, error: LlmError) -> JSONResponse:
        log.error("LLM call failed: %s", error)
        return JSONResponse({"error": "llm_error", "message": "Echo couldn't write that. Try again in a minute."}, 502)

    @app.get("/")
    async def root() -> dict[str, str]:
        """What this is, for anyone who opens the engine's URL. No Qloo call."""
        return {"service": "Echo engine", "health": "/health", "docs": "/docs"}

    @app.get("/health")
    async def health() -> Health:
        return Health(
            ok=True,
            mock=engine.mock,
            qloo_calls_today=await engine.counters.calls_today(),
            qloo_calls_left=await engine.counters.month_left(),
        )

    @app.get("/shows")
    async def shows(q: str = Query(min_length=2, max_length=100)) -> ShowList:
        if engine.mock:
            return ShowList(shows=engine.mock_shows(q))
        await engine.check_cap()
        async with engine.client() as client:
            return ShowList(shows=await pipeline.search_shows(client, q))

    @app.get("/featured")
    async def featured_shows() -> FeaturedList:
        """Written by scripts/warm.py, so nothing here calls Qloo."""
        if engine.mock:
            items = [Analysis.model_validate(engine.example["analysis"])]
        else:
            items = await engine.analyses.featured()
        return FeaturedList(featured=[Featured(show=a.show, analysis_id=a.id) for a in items])

    @app.post("/analyses", status_code=202)
    async def start_analysis(body: AnalysisRequest, tasks: BackgroundTasks) -> AnalysisStarted:
        analysis = await engine.start(body.show_id, body.filters, tasks)
        return AnalysisStarted(id=analysis.id, status=analysis.status)

    @app.get("/analyses/{analysis_id}")
    async def get_analysis(analysis_id: str) -> Analysis:
        return await engine.get(analysis_id)

    @app.get("/analyses/{analysis_id}/guests/{ref}")
    async def guest_details(analysis_id: str, ref: str) -> GuestDetails:
        analysis = await engine.done(analysis_id)
        guest = engine.guest(analysis, ref)
        engine.mock_fails(analysis.show.id, "guest_details")
        maps = await engine.guest_maps(analysis, guest)
        if engine.mock:
            episode = GuestDetails.model_validate({**engine.example["guest_details"], "ref": ref}).episode
        else:
            try:
                episode = await pipeline.llm_step(llm.write_episode(analysis, guest, maps), None, "the episode idea")
            except pipeline.AnalysisFailed as error:
                raise EchoError(502, error.code, error.message) from None
        return GuestDetails(ref=ref, audience_map=maps.audience_map, adds=maps.adds, episode=episode)

    @app.post("/chat")
    async def chat(body: ChatRequest, tasks: BackgroundTasks) -> ChatReply:
        analysis = await engine.done(body.analysis_id)
        engine.mock_fails(analysis.show.id, "chat")
        if engine.mock:
            decision = mocked.decide(analysis.guests, analysis.filters, body.messages)
        else:
            decision = await llm.chat(analysis, body.messages)
        if decision.action == "rerun":
            rerun = await engine.start(analysis.show.id, decision.filters or analysis.filters, tasks)
            return ChatReply(reply=decision.reply, action="rerun", analysis_id=rerun.id)
        if decision.action == "rewrite" and decision.guest_ref and decision.idea:
            # Not saved: an analysis is shared by everyone who runs the same show and filters, featured shows by
            # every visitor. The web app keeps the visitor's own rewrites.
            engine.guest(analysis, decision.guest_ref)
            return ChatReply(reply=decision.reply, action="rewrite", guest_ref=decision.guest_ref, idea=decision.idea)
        return ChatReply(reply=decision.reply, action="none")

    @app.post("/drafts")
    async def drafts(body: DraftRequest) -> DraftList:
        analysis = await engine.done(body.analysis_id)
        guests = [engine.guest(analysis, ref) for ref in body.guest_refs]
        if not engine.mock:
            return DraftList(drafts=await llm.write_drafts(analysis, guests, body))
        template = engine.example["draft"]
        return DraftList(
            drafts=[
                Draft(
                    guest_ref=guest.ref,
                    subject=fill(template["subject"], analysis, guest, body.host_name),
                    body=fill(template["body"], analysis, guest, body.host_name),
                )
                for guest in guests
            ]
        )

    @app.post("/briefings")
    async def briefing(body: BriefingRequest) -> Briefing:
        analysis = await engine.done(body.analysis_id)
        guest = engine.guest(analysis, body.guest_ref)
        if engine.mock:
            return Briefing(markdown=fill(engine.example["briefing"], analysis, guest))
        maps = await engine.guest_maps(analysis, guest)
        return Briefing(markdown=await llm.write_briefing(analysis, guest, maps))

    return app


app = create_app()
