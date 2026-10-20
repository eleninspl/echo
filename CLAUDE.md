# Echo

Entry to the Qloo Agentic Hackathon 2026. Echo finds podcast guests a show's audience will love, who bring a new audience that will love the show back.

**Deadline: 30 October 2026, 23:45 New York** (31 October, 05:45 Athens). A live hosted demo is mandatory.

This repo is only about the Qloo hackathon and Echo.

## Docs

- `docs/echo.md`: the pitch, the flow, fit / love back / reach, rules, risks. Read before changing product behaviour.
- `docs/hackathon.md`: submission requirements, judging, Qloo's rules.
- `docs/qloo.md`: API reference for Echo, with what has been verified on the hackathon server.
- `docs/plan.md`: timeline and open decisions.
- `docs/workstreams.md`: remaining work and possible splits. Not assigned yet.

## Stack

- Engine: Python 3.12 in `engine/` (uv).
- Web app: not decided (Next.js on Vercel proposed). No code yet.
- Anthropic API (`ANTHROPIC_API_KEY`).
- OpenClaw agent for outreach (Telegram, Slack or email). Its weight against the web app is an open decision in `docs/plan.md`.

## Setup

Set keys with `scripts/set-env.sh KEY`, or `pbpaste | scripts/set-env.sh KEY`. Never print, log or commit values from `.env`.

Engine: `cd engine && uv sync && uv run pytest`.

## Qloo API rules

Full detail in `docs/qloo.md`. The rules that break things if ignored:

- Host is `https://hackathon.api.qloo.com` only. `api.qloo.com` and `staging.api.qloo.com` reject hackathon keys with 401.
- Auth is the `X-Api-Key` header. Every call is GET with query-string params, no JSON body.
- Use `/search`, `/v2/tags`, `/v2/insights`, `/entities`, `/v2/analysis/compare`. Never `/recommendations`, `/recs` or `/v2/insights/search`.
- Call Qloo only through `QlooClient` (`engine/`): it checks params per `filter.type` and caches in `.cache/`.
- Invalid params are silently ignored and return 200 with empty `entities`. An empty result usually means a param that isn't valid for that `filter.type`.
- Tags need IDs from `/v2/tags`, never free text.
- Insights returns people who have died (`properties.date_of_death`). Filter them out before showing guests.
- A show's host comes back as a candidate for their own show. Exclude hosts and near-duplicate names.

## Data rules

- Never commit Qloo response data, including result names, scores or entity IDs copied into docs: the repo goes public. Cache only in `.cache/` (git-ignored). Private server-side caching is allowed.
- Results describe groups. Never score private individuals, never send personal data to Qloo, never present a match as a prediction about one person.
- No bulk scraping. Usage limits aren't published and every call shares one quota.

## Status

Update this section whenever something changes.

- **20 Oct:** docs and `scripts/set-env.sh` on branch `docs/echo-plan`, PR #1. Qloo key works (search and insights verified). No app code yet.
- **20 Oct:** logo in `brand/`. Qloo client and spike in `engine/`; first checks answered in `docs/qloo.md`. The data supports fit, love back and reach.
- **Next:** agree the split (`docs/workstreams.md`), then the scoring engine and API.

## Keeping this file current

When a decision is made, an API fact is verified or disproved, or the plan moves, update this file and the matching doc in the same change. Keep this file short and put detail in `docs/`. Mark an API fact as verified only after a real call to the hackathon server.
