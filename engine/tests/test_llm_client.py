import asyncio
import json

import httpx
import pytest

from echo_engine import llm_client
from echo_engine.config import REPO_ROOT, Settings
from echo_engine.llm_client import LlmClient, LlmError, parse_json

SCHEMA = {
    "type": "object",
    "properties": {"title": {"type": "string"}},
    "required": ["title"],
    "additionalProperties": False,
}


def openrouter_reply(content: str) -> dict:
    return {
        "model": "openai/gpt-oss-120b",
        "choices": [{"message": {"role": "assistant", "content": content}}],
        "usage": {"prompt_tokens": 120, "completion_tokens": 30, "cost": 0.00004},
    }


def wrapper_reply(text: str) -> dict:
    return {
        "type": "message",
        "model": "sonnet",
        "content": [{"type": "text", "text": text}],
        "usage": {"input_tokens": 90, "output_tokens": 20},
        "cost_usd": 0.002,
    }


def make_client(backend: str, handler, **kwargs) -> LlmClient:
    sleeps: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    client = LlmClient(
        backend,
        kwargs.pop("model", "test-model"),
        kwargs.pop("api_key", "test-key"),
        transport=httpx.MockTransport(handler),
        sleep=fake_sleep,
        **kwargs,
    )
    client.sleeps = sleeps  # type: ignore[attr-defined]
    return client


async def ask(client: LlmClient, **kwargs) -> llm_client.Reply:
    async with client:
        return await client.json("Write titles.", "One title, please.", SCHEMA, "title", **kwargs)


def test_openrouter_sends_a_strict_schema_and_reads_tokens_and_cost():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=openrouter_reply('{"title": "A night of jokes"}'))

    reply = asyncio.run(ask(make_client("openrouter", handler), effort="low"))

    request = seen[0]
    body = json.loads(request.content)
    assert request.url == "https://openrouter.ai/api/v1/chat/completions"
    assert request.headers["Authorization"] == "Bearer test-key"
    assert body["model"] == "test-model"
    assert body["messages"] == [
        {"role": "system", "content": "Write titles."},
        {"role": "user", "content": "One title, please."},
    ]
    assert body["response_format"] == {
        "type": "json_schema",
        "json_schema": {"name": "title", "strict": True, "schema": SCHEMA},
    }
    assert body["provider"] == {"require_parameters": True}
    assert body["reasoning"] == {"effort": "low", "exclude": True}
    assert reply.data == {"title": "A night of jokes"}
    assert (reply.model, reply.input_tokens, reply.output_tokens, reply.cost_usd) == (
        "openai/gpt-oss-120b",
        120,
        30,
        0.00004,
    )


def test_openrouter_leaves_reasoning_out_unless_asked():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        return httpx.Response(200, json=openrouter_reply('{"title": "x"}'))

    asyncio.run(ask(make_client("openrouter", handler)))
    assert "reasoning" not in seen[0]


def test_claude_cli_sends_the_schema_with_tools_off_outside_the_repo():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=wrapper_reply('{"title": "Pitch night"}'))

    client = make_client("claude-cli", handler, api_key="")
    reply = asyncio.run(ask(client, effort="medium", model="haiku"))

    request = seen[0]
    body = json.loads(request.content)
    assert request.url == "http://127.0.0.1:4301/v1/messages"
    assert "Authorization" not in request.headers
    assert body["model"] == "haiku"
    assert body["system"] == "Write titles."
    assert body["messages"] == [{"role": "user", "content": "One title, please."}]
    assert body["json_schema"] == SCHEMA
    assert body["cli_tools"] == ""
    assert body["strict_mcp_config"] is True
    assert body["effort"] == "medium"
    workdir = client.workdir.resolve()
    assert workdir.is_dir() and REPO_ROOT not in (workdir, *workdir.parents)
    assert reply.data == {"title": "Pitch night"}
    assert (reply.input_tokens, reply.output_tokens, reply.cost_usd) == (90, 20, 0.002)


def test_retries_rate_limits_then_answers():
    statuses = iter([429, 503, 200])

    def handler(request: httpx.Request) -> httpx.Response:
        status = next(statuses)
        if status != 200:
            return httpx.Response(status, text="busy")
        return httpx.Response(200, json=openrouter_reply('{"title": "x"}'))

    client = make_client("openrouter", handler)
    assert asyncio.run(ask(client)).data == {"title": "x"}
    assert client.sleeps == [2.0, 4.0]


def test_asks_again_when_the_answer_is_not_json_then_gives_up():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=openrouter_reply("Sure! Here is a title: A night of jokes"))

    with pytest.raises(LlmError, match="didn't answer with a JSON object"):
        asyncio.run(ask(make_client("openrouter", handler)))
    assert len(calls) == 3


def test_a_bad_request_fails_at_once():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(400, json={"error": {"message": "No endpoints found that support all parameters"}})

    with pytest.raises(LlmError, match="400"):
        asyncio.run(ask(make_client("openrouter", handler)))
    assert len(calls) == 1


def test_says_how_to_start_the_wrapper_when_it_is_not_running():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused", request=request)

    client = make_client("claude-cli", handler, api_key="")
    with pytest.raises(LlmError, match="pnpm dev"):
        asyncio.run(ask(client))
    assert client.sleeps == []


def test_an_error_inside_a_200_is_an_llm_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"error": {"message": "provider down"}})

    with pytest.raises(LlmError, match="provider down"):
        asyncio.run(ask(make_client("openrouter", handler, max_retries=0)))


def test_parse_json_takes_an_object_out_of_fences_and_prose():
    assert parse_json('{"a": 1}') == {"a": 1}
    assert parse_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json('Here you go: {"a": {"b": 2}} Enjoy.') == {"a": {"b": 2}}
    assert parse_json("[1, 2]") is None
    assert parse_json("no json") is None


def test_openrouter_needs_a_key():
    with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
        LlmClient("openrouter", "openai/gpt-oss-120b", "")


def test_groq_needs_a_key_and_reads_as_not_built_without_one():
    with pytest.raises(NotImplementedError, match="GROQ_API_KEY"):
        LlmClient("groq", "openai/gpt-oss-120b", "")


def test_unknown_backend_is_refused():
    with pytest.raises(RuntimeError, match="ECHO_LLM"):
        LlmClient("mistral", "openai/gpt-oss-120b", "key")


def test_groq_sends_a_strict_schema_and_prices_the_tokens():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        reply = openrouter_reply('{"title": "A night of jokes"}')
        del reply["usage"]["cost"]
        return httpx.Response(200, json=reply)

    reply = asyncio.run(ask(make_client("groq", handler), effort="low"))

    request = seen[0]
    body = json.loads(request.content)
    assert request.url == "https://api.groq.com/openai/v1/chat/completions"
    assert request.headers["Authorization"] == "Bearer test-key"
    assert "X-Title" not in request.headers
    assert body["response_format"] == {
        "type": "json_schema",
        "json_schema": {"name": "title", "strict": True, "schema": SCHEMA},
    }
    assert body["reasoning_effort"] == "low"
    assert body["include_reasoning"] is False
    assert "provider" not in body and "reasoning" not in body
    assert reply.data == {"title": "A night of jokes"}
    assert reply.cost_usd == pytest.approx((120 * 0.15 + 30 * 0.60) / 1_000_000)


def test_groq_asks_again_when_the_output_misses_the_schema():
    statuses = iter([400, 200])

    def handler(request: httpx.Request) -> httpx.Response:
        if next(statuses) == 400:
            return httpx.Response(400, json={"error": {"code": "json_validate_failed", "message": "bad output"}})
        return httpx.Response(200, json=openrouter_reply('{"title": "x"}'))

    client = make_client("groq", handler)
    assert asyncio.run(ask(client)).data == {"title": "x"}
    assert client.sleeps == [2.0]


@pytest.fixture
def settings_env(monkeypatch):
    monkeypatch.setattr(llm_client, "get_settings", Settings)
    for name in ("ECHO_LLM", "ECHO_LLM_MODEL", "ECHO_LLM_URL", "OPENROUTER_API_KEY", "GROQ_API_KEY", "VERCEL"):
        monkeypatch.setenv(name, "")
    return monkeypatch


def test_settings_default_to_openrouter_with_gpt_oss(settings_env):
    settings_env.setenv("OPENROUTER_API_KEY", "test-key")
    client = LlmClient.from_settings()
    assert (client.backend, client.model, str(client._http.base_url).rstrip("/")) == (
        "openrouter",
        "openai/gpt-oss-120b",
        "https://openrouter.ai/api/v1",
    )
    asyncio.run(client.aclose())


def test_settings_default_to_groq_when_only_its_key_is_set(settings_env):
    settings_env.setenv("GROQ_API_KEY", "test-key")
    client = LlmClient.from_settings()
    assert (client.backend, client.model, str(client._http.base_url).rstrip("/")) == (
        "groq",
        "openai/gpt-oss-120b",
        "https://api.groq.com/openai/v1",
    )
    asyncio.run(client.aclose())


def test_settings_prefer_openrouter_when_both_keys_are_set(settings_env):
    settings_env.setenv("GROQ_API_KEY", "test-key")
    settings_env.setenv("OPENROUTER_API_KEY", "other-key")
    assert Settings().llm_backend == "openrouter"
    settings_env.setenv("ECHO_LLM", "groq")
    assert Settings().llm_backend == "groq"


def test_settings_without_a_key_stay_on_openrouter_which_reads_as_not_built(settings_env):
    assert Settings().llm_backend == "openrouter"
    with pytest.raises(NotImplementedError, match="OPENROUTER_API_KEY"):
        LlmClient.from_settings()


def test_groq_may_run_on_vercel(settings_env):
    settings_env.setenv("GROQ_API_KEY", "test-key")
    settings_env.setenv("VERCEL", "1")
    client = LlmClient.from_settings()
    assert client.backend == "groq"
    asyncio.run(client.aclose())


def test_settings_pick_the_claude_cli_with_its_own_default_model(settings_env):
    settings_env.setenv("ECHO_LLM", "claude-cli")
    settings_env.setenv("ECHO_LLM_URL", "http://127.0.0.1:5555/")
    client = LlmClient.from_settings()
    assert (client.backend, client.model, str(client._http.base_url).rstrip("/")) == (
        "claude-cli",
        "claude-sonnet-5-5",
        "http://127.0.0.1:5555",
    )
    asyncio.run(client.aclose())


def test_the_claude_cli_never_runs_on_vercel(settings_env):
    settings_env.setenv("ECHO_LLM", "claude-cli")
    settings_env.setenv("VERCEL", "1")
    with pytest.raises(RuntimeError, match="never in production"):
        LlmClient.from_settings()
