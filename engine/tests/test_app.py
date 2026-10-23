import httpx
import pytest
from fastapi.testclient import TestClient

from echo_engine.app import create_app, load_example
from echo_engine.models import Analysis, ChatDecision, GuestDetails, ShowList
from echo_engine.qloo_client import QlooClient

SHOW_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def mock() -> TestClient:
    return TestClient(create_app(mock=True, step_delay=0))


def offline_client() -> QlooClient:
    return QlooClient(
        api_key="test-key",
        transport=httpx.MockTransport(lambda request: httpx.Response(500)),
        sleep=lambda seconds: None,
    )


@pytest.fixture
def real() -> TestClient:
    return TestClient(create_app(mock=False, client_factory=offline_client))


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


def test_real_mode_says_what_is_not_built(real):
    response = real.get("/shows", params={"q": "example"})
    assert response.status_code == 501
    assert response.json()["error"] == "not_implemented"
