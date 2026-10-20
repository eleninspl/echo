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
| **Reach** | How much new audience does the guest bring? | Overlap of the two audience maps (artists, books, movies, brands, podcasts, TV) |

Echo doesn't look for the most similar audience: an identical one brings no one new. It looks for the sweet spot, and requires love back so both sides win. More in [docs/echo.md](docs/echo.md#fit-and-reach).

## Setup

Python 3.12+ and [uv](https://docs.astral.sh/uv/).

```bash
scripts/set-env.sh QLOO_API_KEY   # type the key, it stays hidden
cd engine
uv sync
uv run pytest
uv run python scripts/spike.py "This Week in Startups"
```

## Privacy

- Only public figures and audience-level taste are scored, never private individuals.
- No personal data goes to Qloo. Demographic signals and person-attribute filters are blocked in code.
- Qloo responses are cached privately in `.cache/` and never committed.

## Layout

```
brand/    logo
docs/     pitch, rules, Qloo notes, plan
engine/   Python engine
scripts/  repo helpers
```

## License

[MIT](LICENSE)
