import argparse
import asyncio
import json
import os

from echo_engine.config import DEFAULT_LLM_MODELS, LLM_BACKENDS
from echo_engine.llm_client import LlmClient, LlmError

SYSTEM = "You write short podcast episode titles. Answer only with the JSON the schema asks for."
PROMPT = "A comedy podcast is inviting a well-known chef. Suggest one episode title and a one-line pitch."
SCHEMA = {
    "type": "object",
    "properties": {"title": {"type": "string"}, "pitch": {"type": "string"}},
    "required": ["title", "pitch"],
    "additionalProperties": False,
}


def parse() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send one small structured-output call to Echo's LLM backend.")
    parser.add_argument("prompt", nargs="?", default=PROMPT, help="what to ask for; the answer is a title and a pitch")
    parser.add_argument("--backend", choices=LLM_BACKENDS, help="overrides ECHO_LLM")
    parser.add_argument("--model", help="overrides ECHO_LLM_MODEL")
    parser.add_argument("--effort", help="reasoning effort, for example low or medium")
    return parser.parse_args()


async def main() -> None:
    args = parse()
    if args.backend:
        os.environ["ECHO_LLM"] = args.backend
        os.environ.setdefault("ECHO_LLM_MODEL", "")
        if not args.model:
            args.model = DEFAULT_LLM_MODELS[args.backend]
    try:
        client = LlmClient.from_settings()
    except RuntimeError as error:
        raise SystemExit(str(error)) from error
    async with client:
        try:
            reply = await client.json(
                SYSTEM, args.prompt, SCHEMA, "episode_title", effort=args.effort, model=args.model
            )
        except LlmError as error:
            raise SystemExit(f"{client.backend} failed: {error}") from error
        cost = "unknown" if reply.cost_usd is None else f"${reply.cost_usd:.5f}"
        if client.backend == "claude-cli":
            cost += " at API prices, not charged on a subscription"
        print(f"{client.backend}  {reply.model}  {reply.duration_ms} ms")
        print(f"tokens {reply.input_tokens} in, {reply.output_tokens} out, cost {cost}")
        print(json.dumps(reply.data, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
