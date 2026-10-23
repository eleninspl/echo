<p align="center"><img src="brand/logo-icon.svg" alt="Echo logo" width="120"></p>

# Echo: Find the Guest Who Carries Your Voice to New Ears

Ask an AI agent who to invite on a podcast, or what to talk about, and it suggests the same famous names and safe topics every show already has. Agents are culturally blind, and that's why most shows stop growing: they keep talking to the same people. Echo wires Qloo into OpenClaw to fix this. It maps what a show's audience loves across music, books, film, brands and places, then finds guests in the sweet spot: people the audience will love, who bring a new audience that will love the show back. Every match comes with a data-backed reason and an episode theme that bridges both worlds. Then OpenClaw does the work in Telegram, Slack or email, drafting the invitation, sending it only with the host's approval, and preparing a briefing before recording. A companion web app lets anyone explore their audience map instantly. Echo never scores private individuals and sends no personal data to Qloo.

Stop echoing in the same room. Find the guest, and the story, that carries your voice somewhere new.

> Entry to the [Qloo Agentic Hackathon](https://qloo.devpost.com/) (2026). Work in progress.

## How Echo scores a guest

| | Question | Qloo call |
|---|---|---|
| **Fit** | Will the show's audience love the guest? | `/v2/insights`, `filter.type=urn:entity:person`, signal = show |
| **Love back** | Will the guest's audience love the show? | `/v2/insights`, `filter.type=urn:entity:podcast`, signal = guest, `filter.results.entities` = show |
| **Reach** | How much new audience does the guest bring? | `/v2/insights`, `filter.type=urn:entity:podcast`, signal = show, `filter.results.entities` = the guest audience's top podcasts: the less the show's audience likes them, the more reach |

Echo doesn't look for the most similar audience: an identical one brings no one new. It looks for the sweet spot, and requires love back so both sides win. More in [docs/echo.md](docs/echo.md#fit-love-back-and-reach); the formulas are in [docs/qloo.md](docs/qloo.md#scoring).

## Setup

Python 3.12+ with [uv](https://docs.astral.sh/uv/), and Node 20+.

```bash
scripts/set-env.sh QLOO_API_KEY        # type the key, it stays hidden
scripts/set-env.sh ANTHROPIC_API_KEY

cd engine && uv sync && uv run pytest
ECHO_MOCK=1 uv run uvicorn echo_engine.app:app --reload   # example data, no Qloo calls

cd ../web && cp .env.example .env.local && npm install && npm run dev
```

Drop `ECHO_MOCK=1` to run against Qloo and the LLM.

## Privacy

- Only public figures and audience-level taste are scored, never private individuals.
- No personal data goes to Qloo: only shows, public figures and other public entities are sent as signals. Person-attribute filters are blocked in code.
- Qloo responses are cached privately in `.cache/` and never committed.

## Layout

```
brand/    logo
docs/     plan.md (v1 and the API), qloo.md (Qloo calls and scoring), echo.md (pitch and rules)
engine/   Python engine (FastAPI)
web/      Next.js web app
scripts/  repo helpers and TypeScript probes of the Qloo API
src/      TypeScript Qloo client used by the probes
```

## License

[MIT](LICENSE)
