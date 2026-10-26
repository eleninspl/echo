import asyncio
import inspect
import logging

import pytest
from fastapi.testclient import TestClient

from echo_engine import app as app_module
from echo_engine import config, llm, pipeline
from echo_engine.app import create_app, load_example
from echo_engine.config import Settings
from echo_engine.models import Analysis, Filters, GuestDetails, Show, ShowList

SHOW_ID = "00000000-0000-0000-0000-000000000001"
STEP_KEYS = [key for key, _ in pipeline.STEPS]
FAILURES = load_example()["mock_failures"]
RUN_FAILURES = [f for f in FAILURES if f.get("at") in STEP_KEYS]


def failing(at: str) -> dict:
    return next(f for f in FAILURES if f.get("at") == at)


@pytest.fixture
def mock() -> TestClient:
    return TestClient(create_app(mock=True, step_delay=0))


def test_example_matches_the_contract():
    example = load_example()
    ShowList.model_validate({"shows": example["shows"]})
    analysis = Analysis.model_validate(example["analysis"])
    GuestDetails.model_validate({**example["guest_details"], "ref": "g1"})
    assert all(guest.idea for guest in analysis.guests[:10])
    assert [g.scores.echo for g in analysis.guests] == sorted((g.scores.echo for g in analysis.guests), reverse=True)


def test_health(mock):
    assert mock.get("/health").json()["mock"] is True


def test_root_says_what_the_engine_is(mock):
    assert mock.get("/").json() == {"service": "Echo engine", "health": "/health", "docs": "/docs"}
    assert mock.get("/docs").status_code == 200


def test_shows_and_short_query(mock):
    assert len(mock.get("/shows", params={"q": "example"}).json()["shows"]) == 3
    response = mock.get("/shows", params={"q": "e"})
    assert response.status_code == 400
    assert response.json()["error"] == "bad_request"


def test_featured_opens(mock):
    featured = mock.get("/featured").json()["featured"]
    analysis = mock.get(f"/analyses/{featured[0]['analysis_id']}").json()
    assert analysis["status"] == "done"
    assert len(analysis["guests"]) == 14


def test_analysis_runs_to_done(mock):
    started = mock.post("/analyses", json={"show_id": SHOW_ID, "filters": {"age": "25_to_29"}})
    assert started.status_code == 202
    analysis = mock.get(f"/analyses/{started.json()['id']}").json()
    assert analysis["status"] == "done"
    assert all(step["done"] for step in analysis["steps"])
    assert analysis["filters"]["age"] == "25_to_29"


def test_bad_filters_and_unknown_show(mock):
    assert mock.post("/analyses", json={"show_id": SHOW_ID, "filters": {"age": "teens"}}).status_code == 400
    assert mock.post("/analyses", json={"show_id": "nope"}).json()["error"] == "not_found"


def test_guest_details(mock):
    details = mock.get("/analyses/an_example/guests/g2").json()
    assert details["ref"] == "g2"
    assert details["episode"]["segments"]
    assert mock.get("/analyses/an_example/guests/g99").status_code == 404


def test_chat_reruns(mock):
    reply = mock.post("/chat", json={"analysis_id": "an_example", "messages": [{"role": "user", "content": "younger"}]})
    body = reply.json()
    assert body["action"] == "rerun"
    assert mock.get(f"/analyses/{body['analysis_id']}").json()["filters"]["age"] == "25_to_29"


def ask(mock: TestClient, content: str, analysis_id: str = "an_example") -> dict:
    messages = [{"role": "user", "content": content}]
    return mock.post("/chat", json={"analysis_id": analysis_id, "messages": messages}).json()


def test_a_mock_rerun_changes_the_guests(mock):
    example = mock.get("/analyses/an_example").json()["guests"]
    body = ask(mock, "Less famous guests, please")
    assert body["action"] == "rerun"
    rerun = mock.get(f"/analyses/{body['analysis_id']}").json()
    assert rerun["filters"]["fame"] == "less_famous"
    assert 5 <= len(rerun["guests"]) < len(example)
    assert [g["ref"] for g in rerun["guests"]] == [f"g{i}" for i in range(1, len(rerun["guests"]) + 1)]
    assert [g["name"] for g in rerun["guests"]] != [g["name"] for g in example]


def test_a_mock_rewrite_answers_with_the_idea_and_leaves_the_shared_analysis_alone(mock):
    before = mock.get("/analyses/an_example").json()
    body = ask(mock, "Make the first idea funnier")
    assert (body["action"], body["guest_ref"]) == ("rewrite", "g1")
    assert body["idea"]["title"] != before["guests"][0]["idea"]["title"]
    assert mock.get("/analyses/an_example").json() == before


def test_a_theme_reaches_the_run_and_its_ideas(mock):
    body = ask(mock, "An episode about burnout")
    assert body["action"] == "rerun"
    rerun = mock.get(f"/analyses/{body['analysis_id']}").json()
    assert rerun["filters"]["theme"] == "burnout"
    assert all("burnout" in g["idea"]["pitch"] for g in rerun["guests"] if g["idea"])
    started = mock.post("/analyses", json={"show_id": SHOW_ID, "filters": {"theme": "  road   trips "}}).json()
    assert mock.get(f"/analyses/{started['id']}").json()["filters"]["theme"] == "road trips"
    too_long = {"show_id": SHOW_ID, "filters": {"theme": "x" * 121}}
    assert mock.post("/analyses", json=too_long).status_code == 400


def test_the_chat_says_when_there_is_no_writing_model(mock):
    failure = failing("chat")
    started = mock.post("/analyses", json={"show_id": failure["show"]["id"]}).json()
    response = mock.post("/chat", json={"analysis_id": started["id"], "messages": [{"role": "user", "content": "hi"}]})
    assert response.status_code == 501
    assert response.json() == {"error": "not_implemented", "message": failure["message"]}


def test_drafts_and_revise_rules(mock):
    drafts = mock.post("/drafts", json={"analysis_id": "an_example", "guest_refs": ["g1", "g3"], "host_name": "Sam"})
    assert [d["guest_ref"] for d in drafts.json()["drafts"]] == ["g1", "g3"]
    revise_two = {"analysis_id": "an_example", "guest_refs": ["g1", "g3"], "previous": {"subject": "s", "body": "b"}}
    assert mock.post("/drafts", json={**revise_two, "instruction": "shorter"}).status_code == 400


def test_briefing(mock):
    markdown = mock.post("/briefings", json={"analysis_id": "an_example", "guest_ref": "g1"}).json()["markdown"]
    assert markdown.startswith("# ")


def test_a_deployed_engine_says_which_variables_it_lacks(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "load_dotenv", lambda *args, **kwargs: None)
    names = ("QLOO_API_KEY", "DATABASE_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL")
    for name in (*names, "KV_REST_API_TOKEN"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(app_module, "get_settings", Settings)
    monkeypatch.setenv("ECHO_CACHE_DIR", str(tmp_path))
    create_app(mock=False)  # locally, the files in .cache/ will do

    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("QLOO_API_KEY", "test-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    with pytest.raises(RuntimeError, match="Set UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN on the Vercel"):
        create_app(mock=False)
    assert TestClient(create_app(mock=True)).get("/featured").status_code == 200
    monkeypatch.setenv("KV_REST_API_URL", "https://kv.example.com")
    monkeypatch.setenv("KV_REST_API_TOKEN", "kv-token")
    create_app(mock=False)


def test_mock_failures_cover_every_failure_with_the_real_message():
    assert {f["error"] for f in FAILURES if "error" in f} == {
        "show_unusable",
        "filters_too_narrow",
        "unknown_country",
        "daily_cap",
        "qloo_error",
        "llm_error",
        "engine_error",
        "not_implemented",
    }
    source = inspect.getsource(pipeline) + inspect.getsource(app_module) + inspect.getsource(llm)

    async def llm_message(what: str) -> str:
        async def broken() -> None:
            raise RuntimeError("the model timed out")

        with pytest.raises(pipeline.AnalysisFailed) as failed:
            await pipeline.llm_step(broken(), None, what)
        return failed.value.message

    llm_messages = {asyncio.run(llm_message(what)) for what in ("the episode ideas", "the episode idea")}
    for failure in FAILURES:
        Show.model_validate(failure["show"])
        if "error" in failure:
            assert failure["at"] in [*STEP_KEYS, "start", "guest_details", "chat"]
            assert failure["message"] in llm_messages or f'"{failure["message"]}"' in source, failure["message"]


@pytest.mark.parametrize("failure", RUN_FAILURES, ids=lambda f: f["error"])
def test_a_failing_example_show_fails_its_run_at_its_step(mock, failure):
    started = mock.post("/analyses", json={"show_id": failure["show"]["id"]})
    assert started.status_code == 202
    analysis = mock.get(f"/analyses/{started.json()['id']}").json()
    assert analysis["status"] == "failed"
    assert analysis["error"] == {"error": failure["error"], "message": failure["message"]}
    assert [step["key"] for step in analysis["steps"] if step["done"]] == STEP_KEYS[: STEP_KEYS.index(failure["at"])]
    assert analysis["guests"] == []


def test_the_daily_cap_on_start_is_a_429(mock):
    failure = failing("start")
    response = mock.post("/analyses", json={"show_id": failure["show"]["id"]})
    assert response.status_code == 429
    assert response.json() == {"error": "daily_cap", "message": failure["message"]}


def test_guest_details_on_the_failing_show_are_a_502_llm_error(mock):
    failure = failing("guest_details")
    started = mock.post("/analyses", json={"show_id": failure["show"]["id"]}).json()["id"]
    assert mock.get(f"/analyses/{started}").json()["status"] == "done"
    response = mock.get(f"/analyses/{started}/guests/g1")
    assert response.status_code == 502
    assert response.json() == {"error": "llm_error", "message": failure["message"]}


def test_the_slow_example_show_runs_for_its_seconds(monkeypatch):
    slow = next(f for f in FAILURES if "seconds" in f)
    engine = create_app(mock=True, step_delay=0).state.engine
    waits: list[float] = []

    async def sleep(seconds: float) -> None:
        waits.append(seconds)

    monkeypatch.setattr(app_module.asyncio, "sleep", sleep)
    analysis = asyncio.run(engine.start(slow["show"]["id"], Filters()))
    assert analysis.status == "done"
    assert len(waits) == len(STEP_KEYS)
    assert abs(sum(waits) - slow["seconds"]) < 1e-9


def test_search_finds_the_failing_shows_by_title(mock):
    def titles(q: str) -> list[str]:
        return [show["title"] for show in mock.get("/shows", params={"q": q}).json()["shows"]]

    assert len(titles("fails")) == 5
    assert titles("unknown_country") == ["Fails: unknown_country"]
    assert len(titles("llm_error")) == 2
    assert titles("example") == [show["title"] for show in load_example()["shows"]]


def test_httpx_does_not_log_every_request():
    assert logging.getLogger("httpx").getEffectiveLevel() == logging.WARNING
