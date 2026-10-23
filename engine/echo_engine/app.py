import asyncio
import json
from collections.abc import Callable
from importlib import resources
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


class EchoError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def load_example() -> dict[str, Any]:
    return json.loads(resources.files("echo_engine").joinpath("fixtures/example.json").read_text())


class Engine:
    def __init__(self, mock: bool, step_delay: float, client_factory: Callable[[], QlooClient]) -> None:
        self.mock = mock
        self.step_delay = step_delay
        self.client_factory = client_factory
        self.example = load_example()
        self.analyses: dict[str, Analysis] = {}
        self.featured_ids: list[str] = []
        if mock:
            featured = Analysis.model_validate(self.example["analysis"])
            self.analyses[featured.id] = featured
            self.featured_ids.append(featured.id)

    def get(self, analysis_id: str) -> Analysis:
        analysis = self.analyses.get(analysis_id)
        if analysis is None:
            raise EchoError(404, "not_found", "There's no analysis with that ID.")
        return analysis

    def done(self, analysis_id: str) -> Analysis:
        analysis = self.get(analysis_id)
        if analysis.status != "done":
            raise EchoError(400, "bad_request", "That analysis hasn't finished.")
        return analysis

    @staticmethod
    def guest(analysis: Analysis, ref: str) -> Guest:
        for guest in analysis.guests:
            if guest.ref == ref:
                return guest
        raise EchoError(404, "not_found", "There's no guest with that ref in this analysis.")

    async def show(self, show_id: str) -> Show:
        if self.mock:
            for show in self.example["shows"]:
                if show["id"] == show_id:
                    return Show.model_validate(show)
            raise EchoError(404, "not_found", "There's no show with that ID.")
        async with self.client_factory() as client:
            return await pipeline.get_show(client, show_id)

    async def start(self, show_id: str, filters: Filters, tasks: BackgroundTasks) -> Analysis:
        show = await self.show(show_id)
        analysis = Analysis(
            id=f"an_{uuid4().hex[:12]}",
            status="running",
            show=show,
            filters=filters,
            steps=[Step(key=key, label=label) for key, label in pipeline.STEPS],
        )
        self.analyses[analysis.id] = analysis
        tasks.add_task(self.run_mock if self.mock else self.run, analysis)
        return analysis

    async def run(self, analysis: Analysis) -> None:
        try:
            async with self.client_factory() as client:
                try:
                    await pipeline.run_analysis(client, analysis)
                finally:
                    analysis.qloo_calls = [QlooCall.model_validate(record.to_dict()) for record in client.log]
            analysis.status = "done"
        except EchoError as error:
            fail(analysis, error.code, error.message)
        except QlooError:
            fail(analysis, "qloo_error", "Qloo didn't answer. Try again in a minute.")
        except NotImplementedError:
            fail(analysis, "not_implemented", "This part of the engine isn't built yet.")

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

    async def guest_maps(self, analysis: Analysis, guest: Guest) -> GuestMaps:
        if self.mock:
            return GuestMaps.model_validate(self.example["guest_details"])
        async with self.client_factory() as client:
            return await pipeline.guest_maps(client, analysis, guest)


def fail(analysis: Analysis, code: str, message: str) -> None:
    analysis.status = "failed"
    analysis.error = ErrorBody(error=code, message=message)


def fill(template: str, analysis: Analysis, guest: Guest, host_name: str | None = None) -> str:
    return template.format(name=guest.name, show=analysis.show.title, host=host_name or "")


def create_app(
    mock: bool | None = None,
    step_delay: float = 0.6,
    client_factory: Callable[[], QlooClient] = QlooClient.from_settings,
) -> FastAPI:
    settings = get_settings()
    engine = Engine(settings.mock if mock is None else mock, step_delay, client_factory)
    app = FastAPI(title="Echo engine", version="1")
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
        return Health(ok=True, mock=engine.mock)

    @app.get("/shows")
    async def shows(q: str = Query(min_length=2, max_length=100)) -> ShowList:
        if engine.mock:
            return ShowList.model_validate({"shows": engine.example["shows"]})
        async with engine.client_factory() as client:
            return ShowList(shows=await pipeline.search_shows(client, q))

    @app.get("/featured")
    async def featured() -> FeaturedList:
        items = [engine.analyses[i] for i in engine.featured_ids if i in engine.analyses]
        return FeaturedList(featured=[Featured(show=a.show, analysis_id=a.id) for a in items])

    @app.post("/analyses", status_code=202)
    async def start_analysis(body: AnalysisRequest, tasks: BackgroundTasks) -> AnalysisStarted:
        analysis = await engine.start(body.show_id, body.filters, tasks)
        return AnalysisStarted(id=analysis.id, status=analysis.status)

    @app.get("/analyses/{analysis_id}")
    async def get_analysis(analysis_id: str) -> Analysis:
        return engine.get(analysis_id)

    @app.get("/analyses/{analysis_id}/guests/{ref}")
    async def guest_details(analysis_id: str, ref: str) -> GuestDetails:
        analysis = engine.done(analysis_id)
        guest = engine.guest(analysis, ref)
        maps = await engine.guest_maps(analysis, guest)
        if engine.mock:
            episode = GuestDetails.model_validate({**engine.example["guest_details"], "ref": ref}).episode
        else:
            episode = await llm.write_episode(analysis, guest, maps)
        return GuestDetails(ref=ref, audience_map=maps.audience_map, adds=maps.adds, episode=episode)

    @app.post("/chat")
    async def chat(body: ChatRequest, tasks: BackgroundTasks) -> ChatReply:
        analysis = engine.done(body.analysis_id)
        if engine.mock:
            decision = ChatDecision.model_validate(engine.example["chat"])
        else:
            decision = await llm.chat(analysis, body.messages)
        if decision.action == "rerun":
            rerun = await engine.start(analysis.show.id, decision.filters or analysis.filters, tasks)
            return ChatReply(reply=decision.reply, action="rerun", analysis_id=rerun.id)
        if decision.action == "rewrite" and decision.guest_ref and decision.idea:
            engine.guest(analysis, decision.guest_ref).idea = decision.idea
            return ChatReply(reply=decision.reply, action="rewrite", guest_ref=decision.guest_ref, idea=decision.idea)
        return ChatReply(reply=decision.reply, action="none")

    @app.post("/drafts")
    async def drafts(body: DraftRequest) -> DraftList:
        analysis = engine.done(body.analysis_id)
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
        analysis = engine.done(body.analysis_id)
        guest = engine.guest(analysis, body.guest_ref)
        if engine.mock:
            return Briefing(markdown=fill(engine.example["briefing"], analysis, guest))
        maps = await engine.guest_maps(analysis, guest)
        return Briefing(markdown=await llm.write_briefing(analysis, guest, maps))

    return app


app = create_app()
