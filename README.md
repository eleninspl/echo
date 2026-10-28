<p align="center"><img src="brand/logo-icon.svg" alt="Echo logo" width="120"></p>

# Echo: Find the Guest Who Carries Your Voice to New Ears

Ask an AI assistant who to invite on a podcast, or what to talk about, and it suggests the same famous names and safe topics every show already has. Assistants are culturally blind, and that's why most shows stop growing: they keep talking to the same people. Echo uses Qloo's taste data to fix this. It maps what a show's audience loves across music, TV, film, books, brands and podcasts, then finds guests in the sweet spot: people the audience will love, who bring a new audience that will love the show back. Every guest comes with the tastes both audiences share and an episode idea that bridges them. Then Echo does the work: a full episode plan, an invitation for each guest you pick, and a one-page briefing before you record. Ask Echo, the chat on every analysis, changes the guests or rewrites an idea in your own words.

Stop echoing in the same room. Find the guest, and the story, that carries your voice somewhere new.

> Entry to the [Qloo Agentic Hackathon](https://qloo.devpost.com/) (2026), by Eleni and Leonidas.

## Try it

**[echo-web-mu-taupe.vercel.app](https://echo-web-mu-taupe.vercel.app)**

1. Type a podcast's name and pick it, or open one of the featured shows.
2. In under a minute Echo ranks 20 guests by fit, love back and reach, and puts the sweet spots first, each with the tastes both audiences share and an episode idea. While it runs you see what your listeners love, then the first guests, and can start picking.
3. Open a guest for the full episode and how their fans compare with yours. Ask Echo for "less famous guests", "younger listeners", "an episode about road trips" or "make this idea funnier". Leave out anyone you've already had on.
4. Pick guests and write the invitations, with your dates, fee and a note for each. Echo sends nothing: open each draft in your own email.

## How a request becomes a result

| Step | What happens | Qloo |
| --- | --- | --- |
| Find the show | Search by name | `/search`, podcasts |
| Map the audience | What the show's listeners like more than most people, in six categories | `/v2/insights` with the show as signal, once per category |
| Candidates | The people the show's listeners like most, with less famous ones mixed in | `/v2/insights`, `filter.type=urn:entity:person` |
| Clean-up | Drop people who have died (Qloo, then Wikidata), the show's own hosts (Apple's author line, checked by the LLM), past guests (names in the show's episode titles, from Apple and the show's RSS feed), near-duplicates and anyone the host left out | Apple's podcast lookup and Wikidata, not Qloo |
| Score | Fit, love back and reach for each guest, below | `/v2/insights` per guest, and lenses with `filter.results.entities` |
| Evidence | The tastes both audiences share, the podcasts the guest's fans like that are new to the show, the age groups their fans lean to, and who the guest is: what they founded, led and are known for, with their Wikipedia page | `/v2/insights` with `filter.type=urn:tag` (an allow-list of tag types) and `urn:demographics`; Wikidata |
| Ideas | An episode idea for the top guests, from the evidence and the theme | LLM |
| On a guest | The guest's own audience map next to the show's, then the full episode and the briefing | `/v2/insights` with the guest as signal; LLM |
| Invitations | One draft per picked guest, from what the audiences share, the idea and your details | LLM |

A fresh analysis takes 44 to 68 Qloo calls; analyses and Qloo answers are cached, so opening one again costs none. Filters (fame, age group, country, an episode about a film, show, artist or brand) change the Qloo calls, not just the order. The theme goes to the LLM only.

```
browser ──> web app (Next.js, Vercel) ──> engine (FastAPI, Vercel) ──> Qloo Insights API
                                             │   ├─ Neon Postgres: analyses, writings and a private cache of Qloo answers
                                             │   ├─ Upstash Redis: the shared Qloo throttle and daily cap
                                             │   └─ OpenRouter (gpt-oss-120b): ideas, episodes, chat, drafts, briefings
                                             ├─> Apple's podcast lookup: hosts and past guests
                                             └─> Wikidata: people who have died, and what a guest founded or is known for
```

An analysis runs in the background: `POST /analyses` answers at once, and the web app polls until each step is saved. The engine's API is in [docs/plan.md](docs/plan.md#api), and its interactive reference at [/docs](https://echo-qloo.vercel.app/docs).

## How Echo scores a guest

| | Question | Qloo call |
|---|---|---|
| **Fit** | Will the show's audience love the guest? | `/v2/insights`, `filter.type=urn:entity:person`, signal = show |
| **Love back** | Will the guest's audience love the show? | `/v2/insights`, `filter.type=urn:entity:podcast`, signal = guest, `filter.results.entities` = show |
| **Reach** | How much new audience does the guest bring? | `/v2/insights`, `filter.type=urn:entity:podcast`, signal = show, `filter.results.entities` = the guest audience's top podcasts: the less the show's audience likes them, the more reach |

Echo doesn't look for the most similar audience: an identical one brings no one new. It looks for the sweet spot, and requires love back so both sides win. Fit is adjusted for fame, so the most famous names don't win by default. Each score is a percentile among the 20 guests, and the Echo score is their geometric mean, so a balanced guest ranks above a lopsided one. More in [docs/echo.md](docs/echo.md#fit-love-back-and-reach); the formulas are in [docs/qloo.md](docs/qloo.md#scoring).

## Limits

- **Only shows and people Qloo knows.** Small shows are often missing, and Echo says so and offers the featured shows. Guests are public figures, so it leans to well-known names; the fame filter and fame-adjusted fit push against that.
- **Some shows can't be scored.** Qloo never returns some podcasts as a result, so love back can't be measured for them, and Echo says the show isn't usable.
- **Audience, not topic.** Qloo follows who listens, not what a show is about: a music show can point to journalists its listeners follow.
- **Scores are relative.** They rank the 20 guests against each other; they aren't absolute probabilities. Sweet spots are rare, 1 to 4 in 20, sometimes none.
- **The writing is an LLM's.** It works only from the facts Echo gives it and invents no dates or fees, but read every draft before you send it.
- **No contact details.** Qloo has none, so you type each guest's email; it stays in your browser.
- **Quota.** The hackathon key allows 50,000 Qloo calls a month, so there's a daily cap on fresh analyses.

## Privacy

- Only public figures and audience-level taste are scored, never private individuals. A match describes groups, never one listener.
- No personal data goes to Qloo: only shows, public figures and other public entities are sent as signals. Person-attribute filters are blocked in code.
- Echo sends nothing to a guest. Emails stay in your browser. Notes go to the LLM to write the drafts, and the drafts are kept in your browser, not by the engine.
- Qloo responses are cached privately and never committed.

## Setup

Python 3.12+ with [uv](https://docs.astral.sh/uv/), and Node 20+.

```bash
scripts/set-env.sh QLOO_API_KEY        # type the key, it stays hidden
scripts/set-env.sh OPENROUTER_API_KEY  # for the writing steps

cd engine && uv sync && uv run pytest && uv run ruff check .
ECHO_MOCK=1 uv run uvicorn echo_engine.app:app --reload   # example data, no Qloo or LLM calls

cd ../web && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000
```

Drop `ECHO_MOCK=1` to run against Qloo and the LLM. Locally the engine keeps everything in `.cache/`; it uses Postgres and Redis only when their variables are set. Without an LLM key the writing steps say they aren't set up. The LLM backends are in [docs/plan.md](docs/plan.md#the-llm), deploying in [docs/plan.md](docs/plan.md#deploying-the-engine).

## Echo in OpenClaw

`openclaw/` is a ready workspace for an Echo agent in [OpenClaw](https://docs.openclaw.ai): its instructions (`AGENTS.md`, `SOUL.md`, `IDENTITY.md`) and the `echo` skill, a Node script with no dependencies that calls the engine's API. In whatever chat OpenClaw is connected to, the agent finds the show, ranks its guests, and writes episode plans, invitation drafts and briefings. It sends nothing unless you tell it to send a draft to an address you give it.

```bash
cp -R openclaw ~/.openclaw/workspace-echo
openclaw agents add echo --workspace ~/.openclaw/workspace-echo --non-interactive
openclaw agents bind --agent echo --bind telegram   # or slack, discord, whatsapp
openclaw chat --session agent:echo:main             # or try it in the terminal
```

Then message it: "I host <your show>. Who should I book next?" It uses the public engine. To use another one, set the skill's environment:

```bash
openclaw config set skills.entries.echo.env.ECHO_ENGINE_URL http://localhost:8000
openclaw config set skills.entries.echo.env.ECHO_WEB_URL http://localhost:3000
```

The skill needs Node 18 or later (OpenClaw 2026.10.6 and later need Node 24.22.1 or 26.12.1); `npm run test:skill` runs its tests.

## Layout

```
brand/    logo
docs/     plan.md (v1 and the API), qloo.md (Qloo calls and scoring), echo.md (pitch and rules)
engine/   Python engine (FastAPI)
web/      Next.js web app
openclaw/ an Echo agent for OpenClaw, with the echo skill
scripts/  repo helpers and TypeScript probes of the Qloo API
src/      TypeScript Qloo client used by the probes
```

## License

[MIT](LICENSE)
