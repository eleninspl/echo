# Echo

Entry to the Qloo Agentic Hackathon 2026. Echo finds podcast guests a show's audience will love, who bring a new audience that will love the show back.

**Deadline: 30 October 2026, 23:45 New York** (31 October, 05:45 Athens). A live hosted demo is mandatory. Implementation freeze 27 Oct.

This repo is only about the Qloo hackathon and Echo.

## Docs

Three files, kept short. Don't add more: put new detail in one of these, and cut what's no longer true.

- `docs/plan.md`: **v1 scope**, the engine tasks (Q for Qloo, L for the LLM), dates, open points and the API. Anything not in it is not in v1.
- `docs/qloo.md`: how to call Qloo, the calls behind each step, gotchas and the scoring. Check here before assuming a Qloo feature works or doesn't.
- `docs/echo.md`: the pitch, fit / love back / reach, rules, the hackathon's requirements and judging, risks.

The long 21 Oct proposal (features, a 26-endpoint contract, checks C1 to C90) is in git history at commit 3419283. It is not the plan.

## Stack

- Engine: Python 3.12, FastAPI, uv, in `engine/`, hosted on Vercel with Neon Postgres and Upstash Redis (`docs/plan.md`, Hosting). It calls Qloo and an LLM through `llm_client.py`: OpenRouter in production (default model `gpt-oss-120b`, the final pick waits for a comparison), and locally a Claude subscription through Leonidas's claude-cli-wrapper (`docs/plan.md`, "The LLM"). Which file each half owns is in `docs/plan.md`.
- Web app: Next.js 16, TypeScript, Tailwind, in `web/`, on Vercel. It talks to the engine only, through `web/src/lib/echo.ts`. Next 16 differs from older versions: read `web/AGENTS.md` and the docs it points to before writing web code.
- No bot in v1 (open in `docs/plan.md`).

## Setup

Set keys with `scripts/set-env.sh KEY`, or `pbpaste | scripts/set-env.sh KEY`. Never print, log or commit values from `.env`.

Engine: `cd engine && uv sync && uv run pytest`, lint with `uv run ruff check .`. The Postgres store tests run only with `TEST_DATABASE_URL` set to a throwaway UTF8 database (they drop its tables). Run it with `uv run uvicorn echo_engine.app:app --reload` (port 8000), or with `ECHO_MOCK=1` in front to serve the invented example data instead of Qloo and the LLM. For the LLM locally, put `ECHO_LLM=claude-cli` in `.env` and start the wrapper (`cd ~/Projects/claude-api && pnpm dev`); `uv run python scripts/llm_check.py` checks the backend with one call.

Web: `cd web && npm install && npm run dev` (port 3000). Copy `web/.env.example` to `web/.env.local`. Check with `npm run lint` and `npm run build`.

TypeScript probes, for checking the API only (not product code): `npm run typecheck`, `npm run probe [show names...]` and `npm run map-api [show name]` (about 55 calls, cached). Both write local reports to `.cache/`, never committed. Rerun `map-api` after Qloo changes something and update `docs/qloo.md`.

## Qloo API rules

The ones that break things if ignored. More in `docs/qloo.md`.

- Host `https://hackathon.api.qloo.com` only (other hosts give 401). `X-Api-Key` header. GET only, query-string params.
- Use `/search`, `/v2/tags`, `/v2/insights`, `/entities`, `/v2/analysis/compare`. Never `/recommendations`, `/recs` or `/v2/insights/search`.
- Product code calls Qloo only through `QlooClient` in `engine/` (throttled, cached in `.cache/` locally or Postgres in production, checks params per `filter.type`).
- **Quota: 10 a second, 50,000 a month** for build and judging, resets around 20 Nov. Count calls before adding any per-guest request.
- Invalid params are ignored silently: 200 with empty or unchanged results.
- A lens (`filter.results.entities`) returns 200 even when Qloo can't use the signal, with no `query.affinity`. Check for the affinity. Some shows are never returned as a result, so love back can't be scored for them.
- Insights returns people who have died (`properties.date_of_death`), a show's own hosts and near-duplicates. Filter all three before showing guests.
- Some people return 400 when used as an input. Skip them.
- `urn:entity:videogame`, not `video_game`. Entity weight `high` is the same as none. Tags need IDs from `/v2/tags`.
- Tags include religion, sexuality, ethnicity and similar. Allow-list tag subtypes and screen names; never a block-list alone.

## Data rules

- Never commit Qloo response data, including result names, scores or entity IDs copied into docs: the repo goes public. Cache only in `.cache/` (git-ignored). Private server-side caching is allowed.
- Results describe groups. Never score private individuals, never send personal data to Qloo, never present a match as a prediction about one person.
- No bulk scraping.

## Status

Update this section whenever something changes.

- **20 to 21 Oct:** Python Qloo client and spike in `engine/`, logo in `brand/`, TypeScript probes. Coverage probe: go. Every Qloo feature checked on the hackathon server. Quota raised to 10 a second and 50,000 a month.
- **21 Oct:** a long proposal for features and the contract, merged into the engine branch on 22 Oct.
- **22 Oct:** the top 3 present live on air on 5 Nov. The investor judge's shows are in Qloo and scorable; their hosts come back as candidates.
- **22 Oct (call):** v1 is the engine and the web app only. The proposal was cut to three short docs: no path for shows Qloo doesn't have, no bot, no auth. The engine splits into a Qloo side and an LLM side, one person each. The chat in the web app is the agent.
- **23 Oct:** PR #3 merged: the three docs, the engine skeleton with mock mode, and the Next.js app in `web/`. Leonidas built the Qloo side, Q1 to Q10 (#5).
- **23 Oct:** Eleni took Q over and decided the hosting: Vercel for both pieces (#4, #6). Leonidas had left it open in #5, with Railway as the other option. Q11 to Q17 merged (#7 to #13, #17, #24 to #27): the #5 review fixes, `store.py` (Postgres or local files), Redis counters and throttle, featured shows written by `engine/scripts/warm.py`, evidence that differs per guest, the deploy and its checks.
- **23 Oct:** the web app, W1 to W11 and W13, built against mock mode (#14, #15, #18 to #23). Two Claude sessions worked in parallel, one on the engine and one on the web app; a coordinating session reviewed and merged every PR and keeps this section.
- **23 Oct, live:** engine `https://echo-qloo.vercel.app`, web `https://echo-web-mu-taupe.vercel.app`. Neon Postgres and Upstash Redis are standalone accounts (`docs/plan.md`, "Deploying the engine"). End to end on 8 real shows: every run finished in 5 to 10 s.
- **Not built: L, the LLM side.** Ideas, the full episode, chat, drafts and the briefing answer "not built yet" in production. Nobody has taken L.
- **23 Oct:** W12, the web app's production check on four real shows, and its fixes (#29, #30): a host found by name in the show's description, and the show left out of a guest's map.
- **24 Oct:** W14, the web app redesigned as a film-style broadcast-gallery dashboard (dark only, visual first, every number from real data), PR #34, merged 24 Oct.
- **24 Oct:** W15, the web app redesigned again as a restrained film-style console: four tabs (Guests, Audience, Invite, Qloo), one view of the guests instead of three, a colour per meaning, plain labels, the chat docked on every tab. The analysis page is about a third shorter. PR #37.
- **24 Oct:** the LLM chosen (Eleni): a cheap open-weight model, `gpt-oss-120b` on Groq (#38). Not yet tried on a real show.
- **25 Oct (call, Leonidas and Eleni):** a UI review. Qloo comes out of the UI (the tab, call counts, the quota; it stays in the engine), the chart's axes explain themselves, Ask Echo becomes a round button at the bottom right, Invite asks for the sign-off name once, and the landing's stuck "Opening…" gets fixed. The limit of 5 invitations stays: it caps LLM cost. Open: a 2D/3D chart toggle, the Audience tab as a picture, and maybe a less game-like look (`docs/plan.md`, To agree 6 to 8).
- **25 Oct:** W16, those changes, merged to `main` on 25 Oct.
- **25 Oct:** Ask Echo restyled: the panel opens out of the round button, which stays where it is and shows the Echo logo, with the suggestions as a grid of four.
- **25 Oct:** the LLM client (`llm_client.py`, Leonidas): OpenRouter for production and the model comparison, the Claude CLI wrapper for local development. L1 to L6 have a first version on it, run end to end through the wrapper on a real show (an analysis with ideas takes about 27 s that way). OpenRouter waits for a key; without one, production treats L as not built. Moves the LLM off Groq direct, so Eleni to confirm.
- **25 Oct:** ten home page directions, one per subagent, each a working page at `/designs/01` to `/designs/10` (index at `/designs`), merged to `main` on 25 Oct, built against mock mode. Screenshots and a pick per teammate in a private claude.ai artifact. The team picks one, then it replaces the home page and the `/designs` routes go. Round 2: 09 (Warm Waveform) chosen to build on, six variations at `/designs/09a` to `/designs/09f`. Round 3: 09c (Daylight) chosen, six versions that look less AI-generated at `/designs/09c1` to `/designs/09c6`.
- **25 Oct:** W17, a calm look in place of the game-like console (Eleni): neutral greys, light and dark with a toggle, blue for actions and orange for the sweet spot, each guest's scores as a voiceprint, and the fit-by-reach chart made the main feature (named regions, the top guests named on it).
- **25 Oct:** W18, a page per guest at `/analyses/[id]/guests/[ref]` (Leonidas). The Guests tab keeps a short overview of the selected guest; the full analysis moves to that page, in columns. Merged to `main` on 25 Oct, in progress.
- **25 Oct:** a UI review page by page (Leonidas), starting with the landing page, on `web/guest-page`. The landing now follows `/designs/09`: the title, search and featured shows (a row of links) across three quarters of the width over glows in the score colours that slowly circle (any click on the page sends out a small, faint ripple), and "How Echo scores a guest" below the fold with the full-width wave cut exactly in half by the bottom of the first screen; under the wave, a small diagram and one line per score, and the four labels in a row. The big overlap diagram is gone. The logo and "Find it" are light blue (`--brand`, after gold, purple and the wave's gradient were tried). The score colours across the app are now sky blue, coral and rose for fit, love back and reach (were orange, pink and violet; Leonidas picked the set), the page scrollbar is hidden, and "over-index" and "lukewarm" are out of the copy everywhere, LLM prompt included (`docs/qloo.md`, Keep out).
- **25 Oct:** fixes from a QA run in Chrome (Leonidas): plain words in the prompts, a stricter tag screen (hardship, drug use, placeholders), a chat rewrite selects the guest and marks the idea, picks kept across a reload, and smaller UI fixes.
- **Next:** the open points in `docs/plan.md`, "To agree": who builds L, the four featured shows, politicians among the guests, the web app's domain, the 3D chart, the Audience picture, the home page pick.

## Keeping this file current

When a decision is made, an API fact is verified or disproved, or the plan moves, update this file and the matching doc in the same change. Mark an API fact as verified only after a real call to the hackathon server.
