import pytest

from echo_engine import llm


def unset() -> llm.LlmClient:
    raise NotImplementedError("Tests never call a real LLM")


@pytest.fixture(autouse=True)
def no_real_llm():
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(llm, "client", unset)
        patch.setattr(llm, "ready", lambda: False)
        yield
