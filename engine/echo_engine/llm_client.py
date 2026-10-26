from __future__ import annotations

import asyncio
import json
import tempfile
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

from .config import LLM_BACKENDS, get_settings

OPENROUTER_URL = "https://openrouter.ai/api/v1"
WRAPPER_URL = "http://127.0.0.1:4301"
WRAPPER_START = "cd ~/Projects/claude-api && pnpm dev"
RETRY_STATUSES = {429, 500, 502, 503, 504}
MAX_TOKENS = 8000
Schema = dict[str, Any]


class LlmError(RuntimeError):
    def __init__(self, message: str, *, retry: bool = True) -> None:
        super().__init__(message)
        self.retry = retry


@dataclass
class Reply:
    data: dict[str, Any]
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float | None
    duration_ms: int


@dataclass
class Answer:
    text: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float | None


def outside_repo_workdir() -> Path:
    folder = Path(tempfile.gettempdir()) / "echo-llm"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def parse_json(text: str) -> dict[str, Any] | None:
    for candidate in (text, text[text.find("{") : text.rfind("}") + 1]):
        try:
            data = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(data, dict):
            return data
    return None


def openrouter_body(model: str, system: str, prompt: str, schema: Schema, name: str, effort: str | None) -> dict:
    body: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        "response_format": {"type": "json_schema", "json_schema": {"name": name, "strict": True, "schema": schema}},
        "provider": {"require_parameters": True},
        "max_tokens": MAX_TOKENS,
    }
    if effort:
        body["reasoning"] = {"effort": effort, "exclude": True}
    return body


def openrouter_answer(data: dict[str, Any]) -> Answer:
    if error := data.get("error"):
        raise LlmError(f"OpenRouter error: {error}")
    choices = data.get("choices") or []
    if not choices:
        raise LlmError("OpenRouter returned no choices")
    usage = data.get("usage") or {}
    return Answer(
        text=choices[0].get("message", {}).get("content") or "",
        model=data.get("model", ""),
        input_tokens=usage.get("prompt_tokens", 0),
        output_tokens=usage.get("completion_tokens", 0),
        cost_usd=usage.get("cost"),
    )


def wrapper_body(
    model: str, system: str, prompt: str, schema: Schema, effort: str | None, workdir: Path
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model": model,
        "max_tokens": MAX_TOKENS,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
        "json_schema": schema,
        "cli_tools": "",
        "strict_mcp_config": True,
        "working_directory": str(workdir),
    }
    if effort:
        body["effort"] = effort
    return body


def wrapper_answer(data: dict[str, Any]) -> Answer:
    if error := data.get("error"):
        raise LlmError(f"Claude CLI wrapper error: {error}")
    usage = data.get("usage") or {}
    return Answer(
        text="".join(block.get("text", "") for block in data.get("content") or [] if block.get("type") == "text"),
        model=data.get("model", ""),
        input_tokens=usage.get("input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        cost_usd=data.get("cost_usd"),
    )


class LlmClient:
    def __init__(
        self,
        backend: str,
        model: str,
        api_key: str = "",
        base_url: str | None = None,
        *,
        workdir: Path | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
        timeout: float = 180.0,
        max_retries: int = 2,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        if backend not in LLM_BACKENDS:
            raise RuntimeError(f"ECHO_LLM must be one of {', '.join(LLM_BACKENDS)}, not {backend!r}")
        if not model:
            raise RuntimeError("ECHO_LLM_MODEL is not set")
        headers = {"Accept": "application/json"}
        if backend == "openrouter":
            if not api_key:
                raise RuntimeError("OPENROUTER_API_KEY is not set (put it in the repo-root .env)")
            headers |= {"Authorization": f"Bearer {api_key}", "X-Title": "Echo"}
        self.backend = backend
        self.model = model
        self.workdir = workdir or (outside_repo_workdir() if backend == "claude-cli" else None)
        self.max_retries = max_retries
        self._sleep = sleep
        self._http = httpx.AsyncClient(
            base_url=base_url or (OPENROUTER_URL if backend == "openrouter" else WRAPPER_URL),
            headers=headers,
            timeout=timeout,
            transport=transport,
        )

    @classmethod
    def from_settings(cls, **kwargs: Any) -> LlmClient:
        settings = get_settings()
        if settings.on_vercel and settings.llm_backend == "claude-cli":
            raise RuntimeError("ECHO_LLM=claude-cli runs a Claude subscription locally and never in production")
        return cls(
            settings.llm_backend, settings.llm_model, settings.openrouter_api_key, settings.llm_url or None, **kwargs
        )

    async def __aenter__(self) -> LlmClient:
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._http.aclose()

    async def json(
        self,
        system: str,
        prompt: str,
        schema: Schema,
        name: str,
        *,
        effort: str | None = None,
        model: str | None = None,
    ) -> Reply:
        model = model or self.model
        if self.backend == "openrouter":
            path, body = "/chat/completions", openrouter_body(model, system, prompt, schema, name, effort)
            read = openrouter_answer
        else:
            path, body = "/v1/messages", wrapper_body(model, system, prompt, schema, effort, self.workdir)
            read = wrapper_answer
        started = time.monotonic()
        attempt = 0
        while True:
            try:
                answer = await self._attempt(path, body, read)
                data = parse_json(answer.text)
                if data is None:
                    raise LlmError(f"{model} didn't answer with a JSON object: {answer.text[:200]!r}")
            except LlmError as error:
                if attempt >= self.max_retries or not error.retry:
                    raise
                attempt += 1
                await self._sleep(2.0**attempt)
                continue
            return Reply(
                data=data,
                model=answer.model or model,
                input_tokens=answer.input_tokens,
                output_tokens=answer.output_tokens,
                cost_usd=answer.cost_usd,
                duration_ms=int((time.monotonic() - started) * 1000),
            )

    async def _attempt(self, path: str, body: dict[str, Any], read: Callable[[dict], Answer]) -> Answer:
        try:
            response = await self._http.post(path, json=body)
        except httpx.ConnectError as error:
            if self.backend == "claude-cli":
                raise LlmError(
                    f"The Claude CLI wrapper isn't running at {self._http.base_url}: {WRAPPER_START}", retry=False
                ) from error
            raise LlmError(f"Couldn't reach {self.backend}: {error}") from error
        except httpx.TransportError as error:
            raise LlmError(f"{self.backend} didn't answer: {error!r}") from error
        if response.status_code != 200:
            raise LlmError(
                f"{self.backend} returned {response.status_code}: {response.text[:300]}",
                retry=response.status_code in RETRY_STATUSES,
            )
        try:
            data = response.json()
        except ValueError as error:
            raise LlmError(f"{self.backend} sent a body that isn't JSON: {response.text[:200]!r}") from error
        return read(data)
