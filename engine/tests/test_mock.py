import pytest
from fastapi.testclient import TestClient

from echo_engine import mock
from echo_engine.app import create_app, load_example
from echo_engine.models import Analysis, EpisodeAbout, Filters, MapFocus, Message, TasteAsk


@pytest.fixture
def guests():
    return Analysis.model_validate(load_example()["analysis"]).guests


def decide(guests, text: str, filters: Filters | None = None):
    return mock.decide(guests, filters or Filters(), [Message(role="user", content=text)])


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Younger listeners", Filters(age="25_to_29")),
        ("Older please", Filters(age="45_to_54")),
        ("Listeners in their 30s", Filters(age="30_to_34")),
        ("Less famous guests", Filters(fame="less_famous")),
        ("Rising names from Brazil", Filters(fame="rising", country="Brazil")),
        ("Guests for listeners in the UK", Filters(country="United Kingdom")),
        ("An episode about the film Heat", Filters(episode_about=EpisodeAbout(query="Heat", type="movie"))),
        ("Make it about road trips", Filters(theme="road trips")),
        ("An episode on first jobs.", Filters(theme="first jobs")),
    ],
)
def test_the_mock_chat_reads_the_ask(guests, text, expected):
    decision = decide(guests, text)
    assert decision.action == "rerun"
    assert decision.filters == expected


def test_younger_steps_down_from_the_current_age(guests):
    assert decide(guests, "younger", Filters(age="35_to_44")).filters == Filters(age="30_to_34")


def test_a_rerun_keeps_the_filters_it_doesnt_change(guests):
    decision = decide(guests, "an episode about burnout", Filters(fame="rising"))
    assert decision.filters == Filters(fame="rising", theme="burnout")


def test_rewrites_pick_the_guest_by_position_or_name(guests):
    assert decide(guests, "Make the first idea funnier").guest_ref == "g1"
    second = decide(guests, "A shorter take on the second idea")
    assert (second.action, second.guest_ref) == ("rewrite", "g2")
    assert len(second.idea.pitch) <= len(guests[1].idea.pitch)
    assert decide(guests, f"Rewrite the idea for {guests[3].name}").guest_ref == guests[3].ref


def test_an_unclear_ask_gets_an_answer_not_a_rerun(guests):
    assert decide(guests, "An episode about a film").action == "none"
    assert decide(guests, "Hello there").action == "none"
    assert decide(guests, "younger", Filters(age="24_and_younger")).action == "none"


def test_a_country_filter_trims_and_reorders(guests):
    filtered = mock.guests_for(guests, Filters(country="Brazil"))
    assert len(filtered) < len(guests)
    assert [g.ref for g in filtered] == [f"g{i}" for i in range(1, len(filtered) + 1)]


def test_a_theme_alone_keeps_the_guests(guests):
    themed = mock.guests_for(guests, Filters(theme="road trips"))
    assert [g.name for g in themed] == [g.name for g in guests]
    assert [g.scores for g in themed] == [g.scores for g in guests]


@pytest.fixture
def example():
    return Analysis.model_validate(load_example()["analysis"])


def ask(analysis, text: str, taste=None):
    messages = [Message(role="user", content=text)]
    return mock.decide(analysis.guests, analysis.filters, messages, analysis.audience_map, taste)


@pytest.mark.parametrize(
    ("text", "category", "age", "country"),
    [
        ("What do my listeners read?", "books", None, None),
        ("Which films do they watch?", "film", None, None),
        ("Who here likes jazz?", "music", None, None),
        ("What do younger listeners watch?", "film", "24_and_younger", None),
        ("What do listeners in Canada buy?", "brands", None, "Canada"),
    ],
)
def test_a_question_about_tastes_points_the_map(example, text, category, age, country):
    decision = ask(example, text)
    assert decision.action == "none"
    assert decision.map is not None
    assert (decision.map.category, decision.map.age, decision.map.country) == (category, age, country)
    if not (age or country):
        names = {item.name for row in example.audience_map if row.category == category for item in row.items}
        assert decision.map.tastes and set(decision.map.tastes) <= names


def test_a_question_about_younger_listeners_names_what_they_lean_to():
    client = TestClient(create_app(mock=True, step_delay=0))
    reply = client.post(
        "/chat",
        json={
            "analysis_id": "an_example",
            "messages": [{"role": "user", "content": "What do younger listeners watch?"}],
        },
    ).json()
    assert reply["map"]["age"] == "24_and_younger" and reply["map"]["category"] == "film"
    lens = client.get("/analyses/an_example/map", params={"age": "24_and_younger"}).json()
    films = [item["name"] for row in lens["audience_map"] if row["category"] == "film" for item in row["items"]]
    assert reply["map"]["tastes"] == films[:3]
    assert reply["reply"].endswith(f"{films[2]}.")
    assert "Listeners 24 and younger lean most to" in reply["reply"]


def test_asks_for_guests_still_rerun(example):
    assert ask(example, "Younger listeners").action == "rerun"
    assert ask(example, "What about younger listeners?").action == "rerun"


def test_a_taste_ask_names_its_fans(example):
    film = next(row for row in example.audience_map if row.category == "film").items[0]
    fans = mock.taste_fans(example.guests, example.audience_map, TasteAsk(category="film", name=film.name))
    decision = ask(example, "Who shares it?", fans)
    assert decision.map == MapFocus(category="film", tastes=[film.name])
    assert decision.guest_refs == [fan.ref for fan in fans.guests[:2]]


def test_the_mock_lens_changes_the_map(example):
    lens = mock.lens_map(example.audience_map, "24_and_younger", None)
    assert [row.category for row in lens] == [row.category for row in example.audience_map]
    assert lens != example.audience_map
    assert mock.lens_map(example.audience_map, None, None) == example.audience_map
