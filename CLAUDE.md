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

- Engine: Python 3.12, FastAPI, uv, in `engine/`, hosted on Vercel with Neon Postgres and Upstash Redis (`docs/plan.md`, Hosting). It calls Qloo and an LLM. **The LLM provider and model aren't chosen yet** (open in `docs/plan.md`). Which file each half owns is in `docs/plan.md`.
- Web app: Next.js 16, TypeScript, Tailwind, in `web/`, on Vercel. It talks to the engine only, through `web/src/lib/echo.ts`. Next 16 differs from older versions: read `web/AGENTS.md` and the docs it points to before writing web code.
- No bot in v1 (open in `docs/plan.md`).

## Setup

Set keys with `scripts/set-env.sh KEY`, or `pbpaste | scripts/set-env.sh KEY`. Never print, log or commit values from `.env`.

Engine: `cd engine && uv sync && uv run pytest`, lint with `uv run ruff check .`. The Postgres store tests run only with `TEST_DATABASE_URL` set to a throwaway UTF8 database (they drop its tables). Run it with `uv run uvicorn echo_engine.app:app --reload` (port 8000), or with `ECHO_MOCK=1` in front to serve the invented example data instead of Qloo and the LLM.

Web: `cd web && npm install && npm run dev` (port 3000). Copy `web/.env.example` to `web/.env.local`. Check with `npm run lint` and `npm run build`.

TypeScript probes, for checking the API only (not product code): `npm run typecheck`, `npm run probe [show names...]` and `npm run map-api [show name]` (about 55 calls, cached). Both write local reports to `.cache/`, never committed. Rerun `map-api` after Qloo changes something and update `docs/qloo.md`.

## Qloo API rules

The ones that break things if ignored. More in `docs/qloo.md`.

- Host `https://hackathon.api.qloo.com` only (other hosts give 401). `X-Api-Key` header. GET only, query-string params.
- Use `/search`, `/v2/tags`, `/v2/insights`, `/entities`, `/v2/analysis/compare`. Never `/recommendations`, `/recs` or `/v2/insights/search`.
- Product code calls Qloo only through `QlooClient` in `engine/` (throttled, cached in `.cache/`, checks params per `filter.type`).
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
- **23 Oct:** PR #3 merged, with #1 and #2 inside it. `main` has everything: the three docs, the engine with a FastAPI skeleton of the 9 routes and a mock mode, and the Next.js app in `web/`. Build on branches off `main`.
- **23 Oct:** the Qloo side (Q1 to Q10) is built on branch `engine/qloo-side`, checked offline against a fake Qloo and on 7 real shows (findings in `docs/qloo.md`). Only the deploy is left on Q, and where to host isn't decided. Hosts and past guests come from Apple's free lookup by the show's iTunes ID, not from Qloo.
- **23 Oct:** Eleni merged PR #4, hosting the engine on Vercel with Neon Postgres and Upstash Redis. Leonidas reopened the decision the same day: hosting and the LLM provider are both open points in `docs/plan.md`, with Eleni's Vercel plan kept there as one option.
- **23 Oct:** Eleni reviewed and merged #5, and takes Q from here. Hosting stays Vercel. Q11 to Q16 in `docs/plan.md` cover the #5 review fixes and the move to Postgres and Redis (PR #6). Who takes L and the web app, and the LLM provider, are still open.
- **23 Oct:** Q11 done: the #5 review fixes (PR #7). A real run on the investor judge's show works; its evidence repeats across guests (Q17, should).
- **23 Oct:** Q12 done (PR #8): `engine/echo_engine/store.py` keeps analyses and the Qloo and Apple caches in `.cache/` locally, or in Postgres when `DATABASE_URL` is set. Checked once with the real Qloo on a local Postgres.
- **23 Oct (evening):** two Claude sessions work in parallel, one on the engine's Q tasks and one on the web app; a coordinating session reviews and merges their PRs. Neither edits this Status section.
- **23 to 24 Oct (night):** Q13 (Redis counters and throttle, #9, #10), Q15 (featured shows written by `engine/scripts/warm.py`, #11), Q14 preparation (`engine/vercel.json`, the deploy steps in `docs/plan.md`, #12) and Q17 (evidence that differs per guest, one more Qloo call per analysis, #13) merged. Web app W1 to W5 merged (#14): the plan in `docs/plan.md`, "Web app tasks", the design (a lineup bill), the landing page and the analysis page against mock mode.
- **Next:** Eleni provisions the engine's Vercel project, Neon and Upstash (`docs/plan.md`, "Deploying the engine"), then Q14 and Q16. Featured shows to pick. Web W6 onwards. Who takes L, and the LLM provider, still open.

## Keeping this file current

When a decision is made, an API fact is verified or disproved, or the plan moves, update this file and the matching doc in the same change. Mark an API fact as verified only after a real call to the hackathon server.
