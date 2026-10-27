import pytest

from echo_engine import llm, wikidata


def unset() -> llm.LlmClient:
    raise NotImplementedError("Tests never call a real LLM")


async def nobody_died(people: list[dict]) -> set[str]:
    return set()


@pytest.fixture(autouse=True)
def no_real_llm():
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(llm, "client", unset)
        patch.setattr(llm, "ready", lambda: False)
        yield


@pytest.fixture(autouse=True)
def no_real_wikidata():
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(wikidata, "died", nobody_died)
        yield
