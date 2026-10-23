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
from .config import get_settings
from .models import (
    Analysis,
    AnalysisRequest,
    AnalysisStarted,
    Briefing,
    BriefingRequest,
    ChatDecision,
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
    return EchoError(429, "daily_cap", "Echo has used today's Qloo calls. Featured shows still open.")


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
        self.featured_ids: list[str] = []
        if mock and isinstance(analyses, LocalStore):
            featured = Analysis.model_validate(self.example["analysis"])
            analyses.remember(featured)
            self.featured_ids.append(featured.id)

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

    async def show(self, show_id: str) -> Show:
        if self.mock:
            for show in self.example["shows"]:
                if show["id"] == show_id:
                    return Show.model_validate(show)
            raise EchoError(404, "not_found", "There's no show with that ID.")
        try:
            async with self.client() as client:
                return await pipeline.get_show(client, show_id)
        except pipeline.ShowNotFound:
            raise EchoError(404, "not_found", "There's no show with that ID.") from None

    async def start(self, show_id: str, filters: Filters, tasks: BackgroundTasks | None = None) -> Analysis:
        if not self.mock and (existing := await self.analyses.find(request_key(show_id, filters))):
            return existing
        await self.check_cap()
        show = await self.show(show_id)
        if not self.mock and (existing := await self.analyses.find(request_key(show.id, filters))):
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
            fail(analysis, "qloo_error", "Qloo didn't answer. Try again in a minute.")
        except NotImplementedError:
            fail(analysis, "not_implemented", "This part of the engine isn't built yet.")
        except Exception:
            log.exception("analysis %s failed", analysis.id)
            fail(analysis, "engine_error", "Something went wrong in Echo. Try again.")
        await self.analyses.put(analysis)

    async def run_mock(self, analysis: Analysis) -> None:
        example = Analysis.model_validate(self.example["analysis"])
        for step in analysis.steps:
            await asyncio.sleep(self.step_delay)
            step.done = True
        analysis.audience_map = example.audience_map
        analysis.guests = example.guests
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

    async def warm(self, show_ids: list[str]) -> None:
        for show_id in show_ids:
            try:
                analysis = await self.start(show_id, Filters())
            except EchoError as error:
                log.warning("featured show %s not warmed: %s", show_id, error.message)
                continue
            if analysis.status == "done":
                self.featured_ids.append(analysis.id)


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
    featured: list[str] | None = None,
    daily_cap: int | None = None,
    counters: Counters | None = None,
) -> FastAPI:
    """`store` is a folder for local files or a ready store; by default Postgres when DATABASE_URL is set. With a
    folder, today's count goes next to it; otherwise `counters` are Redis when the Upstash variables are set."""
    settings = get_settings()
    mock = settings.mock if mock is None else mock
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
    warm_up = [] if mock else (settings.featured if featured is None else featured)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        task = asyncio.create_task(engine.warm(warm_up)) if warm_up else None
        yield
        if task:
            task.cancel()
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
        return JSONResponse({"error": "qloo_error", "message": "Qloo didn't answer. Try again in a minute."}, 502)

    @app.exception_handler(NotImplementedError)
    async def not_implemented(_: Request, error: NotImplementedError) -> JSONResponse:
        return JSONResponse({"error": "not_implemented", "message": str(error) or "Not built yet."}, 501)

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
            return ShowList.model_validate({"shows": engine.example["shows"]})
        await engine.check_cap()
        async with engine.client() as client:
            return ShowList(shows=await pipeline.search_shows(client, q))

    @app.get("/featured")
    async def featured_shows() -> FeaturedList:
        found = [await engine.analyses.get(i) for i in engine.featured_ids]
        items = [a for a in found if a is not None]
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
        if engine.mock:
            decision = ChatDecision.model_validate(engine.example["chat"])
        else:
            decision = await llm.chat(analysis, body.messages)
        if decision.action == "rerun":
            rerun = await engine.start(analysis.show.id, decision.filters or analysis.filters, tasks)
            return ChatReply(reply=decision.reply, action="rerun", analysis_id=rerun.id)
        if decision.action == "rewrite" and decision.guest_ref and decision.idea:
            engine.guest(analysis, decision.guest_ref).idea = decision.idea
            await engine.analyses.put(analysis)
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
