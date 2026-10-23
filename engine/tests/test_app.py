import pytest
from fastapi.testclient import TestClient

from echo_engine import app as app_module
from echo_engine import config
from echo_engine.app import create_app, load_example
from echo_engine.config import Settings
from echo_engine.models import Analysis, ChatDecision, GuestDetails, ShowList

SHOW_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def mock() -> TestClient:
    return TestClient(create_app(mock=True, step_delay=0))


def test_example_matches_the_contract():
    example = load_example()
    ShowList.model_validate({"shows": example["shows"]})
    analysis = Analysis.model_validate(example["analysis"])
    GuestDetails.model_validate({**example["guest_details"], "ref": "g1"})
    ChatDecision.model_validate(example["chat"])
    assert all(guest.idea for guest in analysis.guests[:10])
    assert [g.scores.echo for g in analysis.guests] == sorted((g.scores.echo for g in analysis.guests), reverse=True)


def test_health(mock):
    assert mock.get("/health").json()["mock"] is True


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
