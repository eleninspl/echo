import asyncio
import json

import pytest

from echo_engine import llm
from echo_engine.app import load_example
from echo_engine.config import Settings
from echo_engine.llm import client as real_client
from echo_engine.llm_client import LlmError, Reply
from echo_engine.models import (
    Analysis,
    DraftRequest,
    DraftText,
    Episode,
    EpisodeAbout,
    GuestMaps,
    InviteDetails,
    MapItem,
    MapRow,
    Message,
    Person,
    Show,
)

IDEA = {
    "reason": "Your listeners and their fans share a taste for road trips.",
    "title": "On the road",
    "pitch": "Two.",
}


class FakeLlm:
    def __init__(self, answers: dict) -> None:
        self.answers = answers
        self.calls: list[dict] = []

    async def __aenter__(self) -> "FakeLlm":
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None

    async def json(self, system: str, prompt: str, schema: dict, name: str, **kwargs) -> Reply:
        self.calls.append({"system": system, "prompt": prompt, "schema": schema, "name": name})
        answer = self.answers[name]
        data = answer(schema) if callable(answer) else answer
        if isinstance(data, Exception):
            raise data
        return Reply(data=data, model="fake", input_tokens=0, output_tokens=0, cost_usd=None, duration_ms=0)


@pytest.fixture
def fake(monkeypatch):
    def install(**answers) -> FakeLlm:
        llm_fake = FakeLlm(answers)
        monkeypatch.setattr(llm, "client", lambda: llm_fake)
        return llm_fake

    return install


@pytest.fixture
def analysis() -> Analysis:
    return Analysis.model_validate(load_example()["analysis"])


def maps() -> GuestMaps:
    return GuestMaps(
        audience_map=[MapRow(category="music", items=[MapItem(name="Example Band", affinity=0.9)])],
        adds=[MapRow(category="film", items=[MapItem(name="Example Western", affinity=0.7)])],
    )


def facts_of(call: dict) -> dict:
    return json.loads(call["prompt"][call["prompt"].index("\n\n{") + 2 :])


def ref_enum(schema: dict) -> list[str]:
    return schema["properties"]["ideas"]["items"]["properties"]["ref"]["enum"]


def test_ideas_are_written_in_one_call_for_the_top_ten_by_ref(fake, analysis):
    llm_fake = fake(ideas=lambda schema: {"ideas": [{"ref": ref, **IDEA} for ref in ref_enum(schema)]})
    ideas = asyncio.run(llm.write_ideas(analysis))

    call = llm_fake.calls[0]
    top = [guest.ref for guest in analysis.guests if guest.evidence][:10]
    assert len(llm_fake.calls) == 1
    assert ref_enum(call["schema"]) == top
    assert set(ideas) == set(top)
    assert ideas["g1"].title == "On the road"
    facts = facts_of(call)
    assert facts["show"] == analysis.show.title
    assert [guest["ref"] for guest in facts["guests"]] == top
    assert set(facts["guests"][0]) == {
        "ref",
        "name",
        "description",
        "label",
        "fit",
        "love_back",
        "reach",
        "shared_tastes_strongest_first",
        "new_podcasts_their_fans_bring",
        "age_groups_where_their_fans_stand_out",
    }
    assert "Use only the facts in the input" in call["system"]


def test_ideas_ignore_refs_that_were_not_asked_for(fake, analysis):
    fake(ideas={"ideas": [{"ref": "g99", **IDEA}, {"ref": "g2", **IDEA}]})
    assert set(asyncio.run(llm.write_ideas(analysis))) == {"g2"}


def test_no_guests_with_evidence_means_no_call(fake, analysis):
    llm_fake = fake()
    for guest in analysis.guests:
        guest.evidence = None
    assert asyncio.run(llm.write_ideas(analysis)) == {}
    assert llm_fake.calls == []


def test_the_episode_wanted_is_passed_on(fake, analysis):
    analysis.filters.episode_about = EpisodeAbout(query="Example Film", type="movie", used="Example Film (2019)")
    llm_fake = fake(ideas={"ideas": []})
    asyncio.run(llm.write_ideas(analysis))
    assert facts_of(llm_fake.calls[0])["the_host_wants_an_episode_about"] == "Example Film (2019)"


def test_without_an_openrouter_key_the_llm_parts_stay_unbuilt(monkeypatch):
    monkeypatch.setattr(llm, "get_settings", Settings)
    monkeypatch.setenv("ECHO_LLM", "openrouter")
    monkeypatch.setenv("OPENROUTER_API_KEY", "")
    with pytest.raises(NotImplementedError, match="OPENROUTER_API_KEY"):
        real_client()


def test_hosts_are_only_ids_that_were_asked_about(fake):
    people = [Person(id="p1", name="Host One"), Person(id="p2", name="Guest Two")]
    llm_fake = fake(hosts={"host_ids": ["p1", "p9"]})
    show = Show(id="s1", title="Example Show with Host One")
    assert asyncio.run(llm.find_hosts(show, people)) == {"p1"}
    assert llm_fake.calls[0]["schema"]["properties"]["host_ids"]["items"]["enum"] == ["p1", "p2"]
    assert asyncio.run(llm.find_hosts(show, [])) == set()
    assert len(llm_fake.calls) == 1


def test_the_episode_uses_both_audience_maps(fake, analysis):
    episode = {
        "title": "On the road",
        "summary": "Two sentences.",
        "segments": [{"title": "Opening", "points": ["One", "Two"]}],
        "questions": ["What first?"],
    }
    llm_fake = fake(episode=episode)
    result = asyncio.run(llm.write_episode(analysis, analysis.guests[0], maps()))
    assert result.segments[0].points == ["One", "Two"]
    guest = facts_of(llm_fake.calls[0])["guest"]
    assert guest["what_their_fans_love"] == {"music": ["Example Band"]}
    assert guest["what_their_fans_love_that_is_new_to_your_listeners"] == {"film": ["Example Western"]}


def decision(**fields) -> dict:
    return {"reply": "Done.", "action": "none", "filters": None, "guest_ref": None, "idea": None, **fields}


def test_chat_can_ask_for_a_rerun_with_new_filters(fake, analysis):
    filters = {"fame": "less_famous", "age": "25_to_29", "country": None, "episode_about": None}
    llm_fake = fake(chat_decision=decision(action="rerun", filters=filters))
    messages = [Message(role="user", content="Younger and less famous, please")]
    result = asyncio.run(llm.chat(analysis, messages))
    assert result.action == "rerun"
    assert (result.filters.fame, result.filters.age) == ("less_famous", "25_to_29")
    facts = facts_of(llm_fake.calls[0])
    assert facts["conversation"] == [{"role": "user", "content": "Younger and less famous, please"}]
    assert facts["current_filters"] == {
        "fame": "any",
        "age": None,
        "country": None,
        "episode_about": None,
        "theme": None,
    }


def test_the_theme_reaches_every_prompt_through_the_show_facts(fake, analysis):
    analysis.filters.theme = "road trips"
    llm_fake = fake(ideas={"ideas": []})
    asyncio.run(llm.write_ideas(analysis))
    assert facts_of(llm_fake.calls[0])["episode_theme_from_the_host"] == "road trips"
    analysis.filters.theme = None
    assert "episode_theme_from_the_host" not in llm.show_facts(analysis)


def test_chat_can_set_a_theme_and_a_long_one_is_cut(fake, analysis):
    filters = {"fame": "any", "age": None, "country": None, "episode_about": None, "theme": "burnout " * 30}
    llm_fake = fake(chat_decision=decision(action="rerun", filters=filters))
    result = asyncio.run(llm.chat(analysis, [Message(role="user", content="An episode about burnout")]))
    assert result.action == "rerun"
    assert result.filters.theme.startswith("burnout") and len(result.filters.theme) <= 120
    assert "theme" in llm_fake.calls[0]["schema"]["properties"]["filters"]["anyOf"][0]["properties"]


def test_chat_rewrites_one_idea(fake, analysis):
    fake(chat_decision=decision(action="rewrite", guest_ref="g2", idea=IDEA))
    result = asyncio.run(llm.chat(analysis, [Message(role="user", content="A funnier idea for the second guest")]))
    assert (result.action, result.guest_ref, result.idea.title) == ("rewrite", "g2", "On the road")


def test_chat_falls_back_to_an_answer_when_the_action_is_incomplete(fake, analysis):
    fake(chat_decision=decision(action="rewrite", guest_ref="g99", idea=IDEA))
    assert asyncio.run(llm.chat(analysis, [Message(role="user", content="?")])).action == "none"
    fake(chat_decision=decision(action="rerun"))
    assert asyncio.run(llm.chat(analysis, [Message(role="user", content="?")])).action == "none"


def test_chat_filters_that_do_not_validate_are_an_llm_error(fake, analysis):
    bad = {"fame": "any", "age": None, "country": "X", "episode_about": None}
    fake(chat_decision=decision(action="rerun", filters=bad))
    with pytest.raises(LlmError, match="ChatDecision"):
        asyncio.run(llm.chat(analysis, [Message(role="user", content="Only X")]))


def test_drafts_are_one_per_guest_with_the_host_details(fake, analysis):
    llm_fake = fake(
        drafts=lambda schema: {
            "drafts": [
                {"ref": ref, "subject": f"Invite {ref}", "body": "Hi"}
                for ref in schema["properties"]["drafts"]["items"]["properties"]["ref"]["enum"]
            ]
        }
    )
    request = DraftRequest(analysis_id=analysis.id, guest_refs=["g1", "g3"], host_name="Sam", note="We record Fridays")
    drafts = asyncio.run(llm.write_drafts(analysis, [analysis.guests[0], analysis.guests[2]], request))
    assert [(d.guest_ref, d.subject) for d in drafts] == [("g1", "Invite g1"), ("g3", "Invite g3")]
    facts = facts_of(llm_fake.calls[0])
    assert (facts["host_name"], facts["host_note"]) == ("Sam", "We record Fridays")


def test_each_guest_gets_only_their_own_note(fake, analysis):
    llm_fake = fake(
        drafts=lambda schema: {
            "drafts": [
                {"ref": ref, "subject": "Hi", "body": "Hi"}
                for ref in schema["properties"]["drafts"]["items"]["properties"]["ref"]["enum"]
            ]
        }
    )
    request = DraftRequest(analysis_id=analysis.id, guest_refs=["g1", "g3"], notes={"g3": "Ask about the tour"})
    asyncio.run(llm.write_drafts(analysis, [analysis.guests[0], analysis.guests[2]], request))
    guests = facts_of(llm_fake.calls[0])["guests"]
    assert [(g["ref"], g["note_for_this_guest"]) for g in guests] == [("g1", None), ("g3", "Ask about the tour")]


def test_a_revise_keeps_the_guests_own_note(fake, analysis):
    llm_fake = fake(draft={"subject": "Short", "body": "Shorter"})
    request = DraftRequest(
        analysis_id=analysis.id,
        guest_refs=["g1"],
        notes={"g1": "We met at the festival"},
        previous=DraftText(subject="Long", body="Very long"),
        instruction="shorter",
    )
    asyncio.run(llm.write_drafts(analysis, [analysis.guests[0]], request))
    assert facts_of(llm_fake.calls[0])["guest"]["note_for_this_guest"] == "We met at the festival"


def test_each_guest_gets_the_shared_details_with_their_own_on_top(fake, analysis):
    llm_fake = fake(
        drafts=lambda schema: {
            "drafts": [
                {"ref": ref, "subject": "Hi", "body": "Hi"}
                for ref in schema["properties"]["drafts"]["items"]["properties"]["ref"]["enum"]
            ]
        }
    )
    request = DraftRequest(
        analysis_id=analysis.id,
        guest_refs=["g1", "g3"],
        details=InviteDetails(dates="Flexible", fee="$500", format="in_person", place="Our studio", length="45 min"),
        details_by_ref={"g3": InviteDetails(dates="Next month", unpaid=True)},
    )
    asyncio.run(llm.write_drafts(analysis, [analysis.guests[0], analysis.guests[2]], request))
    first, third = (guest["practical_details"] for guest in facts_of(llm_fake.calls[0])["guests"])
    assert first == {
        "recording_dates": "Flexible",
        "fee": "$500",
        "format": "in person, at Our studio",
        "episode_length": "45 min",
    }
    assert third == {**first, "recording_dates": "Next month", "fee": "unpaid"}
    assert "Never invent" in llm_fake.calls[0]["prompt"]


def test_no_details_is_none_in_the_prompt(fake, analysis):
    llm_fake = fake(
        drafts=lambda schema: {
            "drafts": [
                {"ref": ref, "subject": "Hi", "body": "Hi"}
                for ref in schema["properties"]["drafts"]["items"]["properties"]["ref"]["enum"]
            ]
        }
    )
    asyncio.run(llm.write_drafts(analysis, [analysis.guests[0]], DraftRequest(analysis_id="a", guest_refs=["g1"])))
    assert facts_of(llm_fake.calls[0])["guests"][0]["practical_details"] is None


def test_a_revise_keeps_the_details(fake, analysis):
    llm_fake = fake(draft={"subject": "Short", "body": "Shorter"})
    request = DraftRequest(
        analysis_id=analysis.id,
        guest_refs=["g1"],
        details=InviteDetails(format="remote", release="March"),
        details_by_ref={"g1": InviteDetails(fee="$200")},
        previous=DraftText(subject="Long", body="Very long"),
        instruction="shorter",
    )
    asyncio.run(llm.write_drafts(analysis, [analysis.guests[0]], request))
    details = facts_of(llm_fake.calls[0])["guest"]["practical_details"]
    assert details == {"fee": "$200", "format": "remote", "release": "March"}


def test_details_are_checked_and_tidied():
    with pytest.raises(ValueError, match="details"):
        DraftRequest(analysis_id="a", guest_refs=["g1"], details_by_ref={"g2": InviteDetails(fee="$1")})
    with pytest.raises(ValueError):
        InviteDetails(fee="x" * 41)
    with pytest.raises(ValueError):
        InviteDetails(format="hybrid")
    tidy = InviteDetails(dates="  next   week ", fee="$9", unpaid=True, format="remote", place="Studio", length=" ")
    assert (tidy.dates, tidy.fee, tidy.place, tidy.length) == ("next week", None, None, None)
    blank = DraftRequest(analysis_id="a", guest_refs=["g1"], details_by_ref={"g1": InviteDetails(dates=" ")})
    assert blank.details_by_ref == {} and blank.details_for("g1").plainly() == {}
    # A guest's own place replaces the shared format; their own fee replaces "unpaid".
    shared = InviteDetails(format="remote", unpaid=True)
    own = shared.with_own(InviteDetails(place="The pub", fee="$50"))
    assert own.plainly() == {"fee": "$50", "format": "in person, at The pub"}


def test_notes_are_only_for_guests_in_the_request():
    with pytest.raises(ValueError, match="note"):
        DraftRequest(analysis_id="a", guest_refs=["g1"], notes={"g2": "Hi"})
    with pytest.raises(ValueError):
        DraftRequest(analysis_id="a", guest_refs=["g1"], notes={"g1": "x" * 301})
    assert DraftRequest(analysis_id="a", guest_refs=["g1"], notes={"g1": "  "}).notes == {}


def test_a_missing_draft_is_an_llm_error(fake, analysis):
    fake(drafts={"drafts": [{"ref": "g1", "subject": "Hi", "body": "Hi"}]})
    request = DraftRequest(analysis_id=analysis.id, guest_refs=["g1", "g2"])
    with pytest.raises(LlmError, match="drafts"):
        asyncio.run(llm.write_drafts(analysis, analysis.guests[:2], request))


def test_a_draft_is_revised_as_the_host_asks(fake, analysis):
    llm_fake = fake(draft={"subject": "Short", "body": "Shorter"})
    request = DraftRequest(
        analysis_id=analysis.id,
        guest_refs=["g1"],
        previous=DraftText(subject="Long", body="Very long"),
        instruction="shorter",
    )
    drafts = asyncio.run(llm.write_drafts(analysis, [analysis.guests[0]], request))
    assert [(d.guest_ref, d.body) for d in drafts] == [("g1", "Shorter")]
    facts = facts_of(llm_fake.calls[0])
    assert (facts["draft"], facts["instruction"]) == ({"subject": "Long", "body": "Very long"}, "shorter")


def test_the_briefing_is_markdown(fake, analysis):
    fake(briefing={"markdown": "# Guest A\n\n## Who they are"})
    assert asyncio.run(llm.write_briefing(analysis, analysis.guests[0], maps())).startswith("# Guest A")


def test_the_briefing_follows_the_episode_already_planned(fake, analysis):
    llm_fake = fake(briefing={"markdown": "# Guest A"})
    episode = Episode(title="On the road", summary="Two.", segments=[], questions=["Why?"])
    asyncio.run(llm.write_briefing(analysis, analysis.guests[0], maps(), episode))
    assert facts_of(llm_fake.calls[0])["the_episode"]["title"] == "On the road"


def test_every_schema_is_strict(fake, analysis):
    def strict(schema: dict) -> int:
        checked = 0
        if schema.get("type") == "object":
            assert schema["additionalProperties"] is False
            assert schema["required"] == list(schema["properties"])
            checked += 1
        for value in schema.values():
            for child in value if isinstance(value, list) else [value]:
                if isinstance(child, dict):
                    checked += strict(child)
        return checked

    llm_fake = fake(chat_decision=decision(), ideas={"ideas": []}, drafts={"drafts": []})
    asyncio.run(llm.chat(analysis, [Message(role="user", content="Hi")]))
    asyncio.run(llm.write_ideas(analysis))
    with pytest.raises(LlmError):
        asyncio.run(llm.write_drafts(analysis, analysis.guests[:1], DraftRequest(analysis_id="a", guest_refs=["g1"])))
    assert [strict(call["schema"]) for call in llm_fake.calls] == [4, 2, 2]
