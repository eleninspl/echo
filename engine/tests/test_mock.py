import pytest

from echo_engine import mock
from echo_engine.app import load_example
from echo_engine.models import Analysis, EpisodeAbout, Filters, Message


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
