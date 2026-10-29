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
        ("An episode about the film Heat", Filters(episode_about=EpisodeAbout(query="Heat", type="movie"))),
        ("Make it about road trips", Filters(theme="road trips")),
        ("An episode on first jobs.", Filters(theme="first jobs")),
    ],
)
def test_the_mock_chat_reads_the_ask(guests, text, expected):
    decision = decide(guests, text)
    assert decision.action == "rerun"
    assert decision.filters == expected


@pytest.mark.parametrize("text", ["Rising names from Brazil", "Guests for listeners in the UK"])
def test_the_mock_chat_has_no_country_filter(guests, text):
    decision = decide(guests, text)
    assert decision.action == "none"
    assert decision.reply == "Echo doesn't filter guests by country."


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


def test_the_mock_chat_leaves_out_a_guest_by_name(guests):
    named = decide(guests, f"Drop {guests[3].name}, they're not for us")
    assert (named.action, named.guest_ref, named.why) == ("leave_out", guests[3].ref, "not_for_us")
    assert decide(guests, f"We had {guests[0].name} on last year").why == "had_on"
    assert decide(guests, "Leave out the comedian").action == "none"


@pytest.fixture
def example():
    return Analysis.model_validate(load_example()["analysis"])


def ask(analysis, text: str, taste=None):
    messages = [Message(role="user", content=text)]
    return mock.decide(analysis.guests, analysis.filters, messages, analysis.audience_map, taste)


@pytest.mark.parametrize(
    ("text", "category"),
    [
        ("What do my listeners read?", "books"),
        ("Which films do they watch?", "film"),
        ("Who here likes jazz?", "music"),
        ("What do younger listeners watch?", "film"),
    ],
)
def test_a_question_about_tastes_points_the_map(example, text, category):
    decision = ask(example, text)
    assert decision.action == "none"
    assert decision.map is not None
    assert decision.map.category == category
    names = {item.name for row in example.audience_map if row.category == category for item in row.items}
    assert decision.map.tastes and set(decision.map.tastes) <= names


def test_the_map_the_chat_points_at_is_all_the_listeners():
    client = TestClient(create_app(mock=True, step_delay=0))
    reply = client.post(
        "/chat",
        json={
            "analysis_id": "an_example",
            "messages": [{"role": "user", "content": "What do younger listeners watch?"}],
        },
    ).json()
    assert set(reply["map"]) == {"category", "tastes"}
    assert reply["map"]["category"] == "film" and len(reply["map"]["tastes"]) == 3


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
