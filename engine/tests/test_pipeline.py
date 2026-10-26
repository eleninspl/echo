import asyncio
import json

import httpx
import pytest
from fastapi import BackgroundTasks
from fastapi.testclient import TestClient

from echo_engine import apple, llm
from echo_engine.app import create_app
from echo_engine.llm_client import LlmError, Reply
from echo_engine.models import Filters
from echo_engine.qloo_client import QlooClient
from scripts import warm
from tests.fake_qloo import SHOW_ID, SHOW_TITLE, THIN_SHOW_ID, WEAK_TOP_SHOW_ID, handler


def fake_client(**kwargs) -> QlooClient:
    return QlooClient(
        api_key="test-key",
        base_url="https://hackathon.api.qloo.com",
        transport=httpx.MockTransport(handler),
        limiter=None,
        **kwargs,
    )


@pytest.fixture
def engine(tmp_path, monkeypatch) -> TestClient:
    async def author(itunes_id: str) -> str:
        return "Example Network"

    async def titles(itunes_id: str, limit: int = 50) -> list[str]:
        return ["Pat Before on invented things", "A solo episode"]

    monkeypatch.setattr(apple, "author", author)
    monkeypatch.setattr(apple, "episode_titles", titles)
    return TestClient(create_app(mock=False, client_factory=fake_client, store=tmp_path / "analyses"))


def state(client: TestClient):
    return client.app.state.engine


def calls_today(engine: TestClient) -> int:
    return engine.get("/health").json()["qloo_calls_today"]


def run(engine: TestClient, show_id: str = SHOW_ID, **filters) -> dict:
    started = engine.post("/analyses", json={"show_id": show_id, "filters": filters})
    assert started.status_code == 202, started.text
    return engine.get(f"/analyses/{started.json()['id']}").json()


def test_search_returns_shows(engine):
    shows = engine.get("/shows", params={"q": "example"}).json()["shows"]
    assert shows[0]["title"] == "Example Show with Sam Host"
    assert shows[0]["image_url"]


def test_unknown_show_is_404(engine):
    response = engine.post("/analyses", json={"show_id": "not-a-uuid"})
    assert response.status_code == 404


def test_full_analysis(engine):
    analysis = run(engine)
    assert analysis["status"] == "done", analysis["error"]
    assert all(step["done"] for step in analysis["steps"])
    assert [row["category"] for row in analysis["audience_map"]] == [
        "music",
        "tv",
        "film",
        "books",
        "brands",
        "podcasts",
    ]
    assert all(len(row["items"]) == 8 for row in analysis["audience_map"])

    guests = analysis["guests"]
    names = {g["name"] for g in guests}
    assert len(guests) == 20
    assert [g["ref"] for g in guests] == [f"g{i}" for i in range(1, 21)]
    assert not names & {"Person 00", "Sam Host", "Person 02", "Person 03", "Person 07", "Pat Before"}
    assert sum(1 for g in guests if g["name"] == "Person 04") == 1
    with_facts = next(g for g in guests if g["name"] == "Person 04")
    assert with_facts["bio"] == "Invented person 4. Known for Invented Film."
    assert with_facts["links"]["website"] == "https://example.com/p4"
    assert all(g["bio"] is None for g in guests if g["name"] != "Person 04")
    assert {"name": "Sam Host", "why": "host"} in analysis["left_out"]
    assert {"name": "Pat Before", "why": "past_guest"} in analysis["left_out"]

    echoes = [g["scores"]["echo"] for g in guests]
    assert echoes == sorted(echoes, reverse=True)
    for guest in guests:
        for key in ("fit", "love_back", "echo"):
            assert 0 <= guest["scores"][key] <= 1
        assert guest["label"] in {"sweet_spot", "safe", "far", "long_shot", "balanced"}
        assert guest["links"]["imdb"].startswith("https://www.imdb.com/name/nm")

    explained = [g for g in guests if g["evidence"]]
    assert len(explained) == 10 and guests[:10] == explained
    for guest in explained:
        assert guest["evidence"]["shared_tastes"]
        assert "Religion" not in guest["evidence"]["shared_tastes"]
        assert len(guest["evidence"]["new_podcasts"]) <= 3
    assert all(g["idea"] is None for g in guests)
    assert analysis["qloo_calls"]
    assert not any("test-key" in str(call) for call in analysis["qloo_calls"])


def test_evidence_differs_per_guest(engine):
    explained = [guest["evidence"] for guest in run(engine)["guests"][:10]]
    assert len({tuple(e["shared_tastes"]) for e in explained}) > 1
    assert len({tuple(e["new_podcasts"]) for e in explained}) > 1


def test_same_request_is_reused(engine):
    first = engine.post("/analyses", json={"show_id": SHOW_ID}).json()["id"]
    second = engine.post("/analyses", json={"show_id": SHOW_ID}).json()["id"]
    assert first == second


def test_filters_change_the_lists_and_use_a_fit_lens(engine):
    analysis = run(engine, fame="less_famous", age="25_to_29", country="Greece")
    assert analysis["status"] == "done", analysis["error"]
    params = [call["params"] for call in analysis["qloo_calls"] if call["path"] == "/v2/insights"]
    lists = [p for p in params if p["filter.type"] == "urn:entity:person" and "filter.results.entities" not in p]
    assert any(
        p.get("filter.popularity.max") == "0.7" and p.get("signal.demographics.age") == "25_to_29" for p in lists
    )
    assert any(p["filter.type"] == "urn:entity:person" and "filter.results.entities" in p for p in params)


def test_episode_about_reports_what_was_used(engine):
    analysis = run(engine, episode_about={"query": "example film", "type": "movie"})
    assert analysis["status"] == "done", analysis["error"]
    assert analysis["filters"]["episode_about"]["used"] == "Example Film"


def test_unknown_country_fails_clearly(engine):
    analysis = run(engine, country="Atlantis")
    assert analysis["status"] == "failed"
    assert analysis["error"]["error"] == "unknown_country"


def test_filters_that_match_nobody_say_so(engine):
    analysis = run(engine, country="Nowhere")
    assert analysis["status"] == "failed"
    assert analysis["error"]["error"] == "filters_too_narrow"


def test_thin_show_is_unusable(engine):
    analysis = run(engine, THIN_SHOW_ID)
    assert analysis["status"] == "failed"
    assert analysis["error"]["error"] == "show_unusable"


def test_guest_details_without_the_llm(engine):
    analysis = run(engine)
    details = engine.get(f"/analyses/{analysis['id']}/guests/g1").json()
    assert details["episode"] is None
    assert details["audience_map"]
    assert all(row["items"] for row in details["adds"])


def test_a_guest_map_leaves_the_show_out(engine):
    analysis = run(engine)
    for guest in analysis["guests"][:4]:
        details = engine.get(f"/analyses/{analysis['id']}/guests/{guest['ref']}").json()
        names = {item["name"] for key in ("audience_map", "adds") for row in details[key] for item in row["items"]}
        assert names and SHOW_TITLE not in names


def test_analyses_survive_a_restart(tmp_path, monkeypatch, engine):
    analysis = run(engine)
    again = TestClient(create_app(mock=False, client_factory=fake_client, store=tmp_path / "analyses"))
    assert again.get(f"/analyses/{analysis['id']}").json()["status"] == "done"


def test_llm_routes_say_they_are_not_built(engine):
    analysis = run(engine)
    response = engine.post("/briefings", json={"analysis_id": analysis["id"], "guest_ref": "g1"})
    assert response.status_code == 501
    assert response.json()["error"] == "not_implemented"


def test_a_running_analysis_is_reused(engine):
    async def start_twice() -> tuple[str, str]:
        first = await state(engine).start(SHOW_ID, Filters(), BackgroundTasks())
        second = await state(engine).start(SHOW_ID, Filters(), BackgroundTasks())
        return first.id, second.id

    first, second = asyncio.run(start_twice())
    assert first == second


def test_a_weak_top_person_does_not_make_the_show_unusable(engine):
    analysis = run(engine, WEAK_TOP_SHOW_ID)
    assert analysis["status"] == "done", analysis["error"]


def test_the_daily_cap_stops_fresh_calls_everywhere(engine):
    analysis = run(engine)
    state(engine).daily_cap = calls_today(engine)
    response = engine.get(f"/analyses/{analysis['id']}/guests/g1")
    assert response.status_code == 429
    assert response.json()["error"] == "daily_cap"
    assert engine.get(f"/analyses/{analysis['id']}").json()["status"] == "done"


def test_a_run_that_reaches_the_cap_fails_with_daily_cap(engine):
    state(engine).daily_cap = 10
    analysis = run(engine)
    assert analysis["status"] == "failed"
    assert analysis["error"]["error"] == "daily_cap"


def test_usage_is_saved_once_the_client_closes(engine, tmp_path):
    run(engine)
    saved = json.loads((tmp_path / "usage.json").read_text())
    assert saved["calls"] == calls_today(engine) > 0


def test_an_llm_failure_is_an_llm_error_and_can_be_retried(engine, monkeypatch):
    async def broken(analysis):
        raise RuntimeError("the model timed out")

    monkeypatch.setattr(llm, "write_ideas", broken)
    failed = run(engine)
    assert failed["status"] == "failed"
    assert failed["error"]["error"] == "llm_error"
    monkeypatch.undo()
    retried = engine.post("/analyses", json={"show_id": SHOW_ID, "filters": {}}).json()["id"]
    assert retried != failed["id"]


def test_a_bad_saved_analysis_is_skipped(tmp_path, engine):
    analysis = run(engine)
    (tmp_path / "analyses" / "an_broken.json").write_text('{"id": "an_broken"}')
    again = TestClient(create_app(mock=False, client_factory=fake_client, store=tmp_path / "analyses"))
    assert again.get(f"/analyses/{analysis['id']}").json()["status"] == "done"
    assert again.get("/analyses/an_broken").status_code == 404


def test_warm_runs_the_featured_shows_fresh_and_featured_reads_them(engine):
    earlier = run(engine)
    assert asyncio.run(warm.warm(state(engine), [SHOW_ID, "example"]))
    featured = engine.get("/featured").json()["featured"]
    assert [item["show"]["id"] for item in featured] == [SHOW_ID, SHOW_ID]
    ids = [item["analysis_id"] for item in featured]
    assert len(set(ids)) == 2
    assert earlier["id"] not in ids
    assert all(engine.get(f"/analyses/{i}").json()["status"] == "done" for i in ids)


def test_featured_is_unchanged_unless_every_show_finishes(engine):
    assert asyncio.run(warm.warm(state(engine), [SHOW_ID]))
    before = engine.get("/featured").json()
    assert not asyncio.run(warm.warm(state(engine), [SHOW_ID, THIN_SHOW_ID]))
    assert not asyncio.run(warm.warm(state(engine), ["99999999-9999-4999-8999-999999999999"]))
    assert engine.get("/featured").json() == before


def test_featured_needs_no_qloo_call(tmp_path, engine):
    asyncio.run(warm.warm(state(engine), [SHOW_ID]))

    def no_qloo(**kwargs) -> QlooClient:
        raise AssertionError("/featured called Qloo")

    again = TestClient(create_app(mock=False, client_factory=no_qloo, store=tmp_path / "analyses"))
    featured = again.get("/featured").json()["featured"]
    assert again.get(f"/analyses/{featured[0]['analysis_id']}").json()["status"] == "done"


def test_a_run_with_the_llm_puts_ideas_on_the_top_guests(engine, monkeypatch):
    class Ideas:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return None

        async def json(self, system, prompt, schema, name, **kwargs):
            if name == "hosts":
                data = {"host_ids": []}
            else:
                refs = schema["properties"]["ideas"]["items"]["properties"]["ref"]["enum"]
                ideas = [{"ref": ref, "reason": "Why.", "title": f"Idea {ref}", "pitch": "Two."} for ref in refs]
                data = {"ideas": ideas}
            return Reply(data=data, model="fake", input_tokens=0, output_tokens=0, cost_usd=None, duration_ms=0)

    monkeypatch.setattr(llm, "client", Ideas)
    analysis = run(engine)
    assert analysis["status"] == "done"
    with_ideas = [guest["ref"] for guest in analysis["guests"] if guest["idea"]]
    assert with_ideas == [guest["ref"] for guest in analysis["guests"] if guest["evidence"]]
    assert analysis["guests"][0]["idea"]["title"] == f"Idea {analysis['guests'][0]['ref']}"


def test_a_failed_llm_call_on_a_route_is_a_502_llm_error(engine, monkeypatch):
    async def broken(analysis, messages):
        raise LlmError("the model sent nonsense")

    monkeypatch.setattr(llm, "chat", broken)
    analysis = run(engine)
    messages = [{"role": "user", "content": "Hi"}]
    response = engine.post("/chat", json={"analysis_id": analysis["id"], "messages": messages})
    assert response.status_code == 502
    assert response.json() == {"error": "llm_error", "message": "Echo couldn't write that. Try again in a minute."}


def test_the_episode_and_briefing_are_written_once_per_guest(engine, monkeypatch):
    written: list[str] = []

    class Writer:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return None

        async def json(self, system, prompt, schema, name, **kwargs):
            written.append(name)
            data = {
                "hosts": {"host_ids": []},
                "ideas": {"ideas": []},
                "episode": {"title": "On the road", "summary": "Two.", "segments": [], "questions": ["Why?"]},
                "briefing": {"markdown": "# Guest"},
            }[name]
            return Reply(data=data, model="fake", input_tokens=0, output_tokens=0, cost_usd=None, duration_ms=0)

    monkeypatch.setattr(llm, "client", Writer)
    analysis = run(engine)
    written.clear()
    for _ in range(2):
        details = engine.get(f"/analyses/{analysis['id']}/guests/g1").json()
        assert details["episode"]["title"] == "On the road"
        briefing = engine.post("/briefings", json={"analysis_id": analysis["id"], "guest_ref": "g1"})
        assert briefing.json() == {"markdown": "# Guest"}
    assert written == ["episode", "briefing"]
    engine.get(f"/analyses/{analysis['id']}/guests/g2")
    assert written == ["episode", "briefing", "episode"]


def test_a_rewritten_idea_gets_its_own_episode_briefing_and_draft(engine, monkeypatch):
    prompts: dict[str, list[str]] = {}

    class Writer:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return None

        async def json(self, system, prompt, schema, name, **kwargs):
            prompts.setdefault(name, []).append(prompt)
            data = {
                "hosts": {"host_ids": []},
                "ideas": {"ideas": []},
                "episode": {"title": "On the road", "summary": "Two.", "segments": [], "questions": ["Why?"]},
                "briefing": {"markdown": "# Guest"},
                "drafts": {"drafts": [{"ref": "g1", "subject": "Hello", "body": "Hi"}]},
            }[name]
            return Reply(data=data, model="fake", input_tokens=0, output_tokens=0, cost_usd=None, duration_ms=0)

    monkeypatch.setattr(llm, "client", Writer)
    analysis = run(engine)
    idea = {"title": "A drive to Indiana", "pitch": "Small towns.", "reason": "Both like road trips."}
    path = f"/analyses/{analysis['id']}/guests/g1"
    engine.get(path)
    for _ in range(2):
        assert engine.get(path, params=idea).status_code == 200
        briefing = {"analysis_id": analysis["id"], "guest_ref": "g1", "idea": idea}
        assert engine.post("/briefings", json=briefing).status_code == 200
    assert len(prompts["episode"]) == 2 and len(prompts["briefing"]) == 1
    assert "A drive to Indiana" in prompts["episode"][1] and "A drive to Indiana" not in prompts["episode"][0]
    assert "A drive to Indiana" in prompts["briefing"][0]
    drafts = {"analysis_id": analysis["id"], "guest_refs": ["g1"], "ideas": {"g1": idea}}
    assert engine.post("/drafts", json=drafts).status_code == 200
    assert "A drive to Indiana" in prompts["drafts"][0]


def test_a_rewritten_idea_comes_whole_and_for_a_guest_asked_for(engine):
    analysis = run(engine)
    path = f"/analyses/{analysis['id']}/guests/g1"
    assert engine.get(path, params={"title": "Only a title"}).status_code == 400
    idea = {"title": "T", "pitch": "P", "reason": "R"}
    drafts = {"analysis_id": analysis["id"], "guest_refs": ["g1"], "ideas": {"g2": idea}}
    assert engine.post("/drafts", json=drafts).status_code == 400
