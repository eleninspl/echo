# Echo

Entry to the Qloo Agentic Hackathon 2026. Echo finds podcast guests a show's audience will love, who bring a new audience that will love the show back.

**Deadline: 30 October 2026, 23:45 New York** (31 October, 05:45 Athens). A live hosted demo is mandatory.

This repo is only about the Qloo hackathon and Echo.

## Docs

- `docs/echo.md`: the pitch, the flow, fit / love back / reach, rules, risks. Read before changing product behaviour.
- `docs/hackathon.md`: submission requirements, judging, Qloo's rules.
- `docs/qloo.md`: API reference for Echo, with what has been verified on the hackathon server.
- `docs/qloo-map.md`: every Qloo API feature, whether it works on the hackathon server, and what Echo could use it for. Check here before assuming a feature exists or doesn't.
- `docs/plan.md`: timeline and open decisions.

## Stack

- Next.js on Vercel, TypeScript, Anthropic API (`ANTHROPIC_API_KEY`). No app code yet.
- OpenClaw agent for outreach (Telegram, Slack or email). Its weight against the web app is an open decision in `docs/plan.md`.

## Setup

Set keys with `scripts/set-env.sh KEY`, or `pbpaste | scripts/set-env.sh KEY`. Never print, log or commit values from `.env`.

- `npm run typecheck`
- `npm run probe [show names...]`: scores guests for each show and writes a local report to `.cache/probe/` (never commit it).
- `npm run map-api [show name]`: checks every Qloo feature once (about 55 calls, cached) and writes a local report to `.cache/map/`. Rerun it after Qloo changes something, and update `docs/qloo-map.md`.

Code: Qloo client in `src/lib/qloo/` (throttled, cached, tracks quota). Echo's Qloo calls in `src/lib/echo/signals.ts`.

## Qloo API rules

Full detail in `docs/qloo.md`. The rules that break things if ignored:

- Host is `https://hackathon.api.qloo.com` only. `api.qloo.com` and `staging.api.qloo.com` reject hackathon keys with 401.
- Auth is the `X-Api-Key` header. Every call is GET with query-string params, no JSON body.
- Use `/search`, `/v2/tags`, `/v2/insights`, `/entities`, `/v2/analysis/compare`. Never `/recommendations`, `/recs` or `/v2/insights/search`.
- Invalid params are silently ignored and return 200 with empty `entities`. An empty result usually means a param that isn't valid for that `filter.type`.
- Tags need IDs from `/v2/tags`, never free text.
- **Quota: 10 requests per second, 50,000 per month** (raised from 5 and 10,000 on 21 Oct; resets around 20 Nov), covering build and judging. Always go through the client in `src/lib/qloo/` (throttled and cached). Count calls before adding any per-guest request.
- Insights returns people who have died (`properties.date_of_death`) and a show's own hosts. Filter both out before showing guests.
- Some people return 400 when used as an input. Skip them.
- Video games are `urn:entity:videogame`. The guide's `video_game` returns 400.
- Audience IDs go in as the `urn:audience:...` value from `id`. The UUID in `entity_id` is silently ignored.
- `signal.interests.entities.weight` is one value for all entities (`very_low` to `very_high`), not one per entity.
- Person tags include Wikipedia categories about religion, sexuality and similar, and `urn:tag` returns religion and ethnicity subtypes. Use an allow-list of tag subtypes for themes and reasons, never a block-list. Never use the political, beliefs or communities audience types.

## Data rules

- Never commit Qloo response data, including result names, scores or entity IDs copied into docs: the repo goes public. Cache only in `.cache/` (git-ignored). Private server-side caching is allowed.
- Results describe groups. Never score private individuals, never send personal data to Qloo, never present a match as a prediction about one person.
- No bulk scraping. Usage limits aren't published and every call shares one quota.

## Status

Update this section whenever something changes.

- **20 Oct:** docs and `scripts/set-env.sh` on branch `docs/echo-plan`, PR #1. Qloo client and coverage probe (TypeScript) on branch `probe/qloo-coverage`, no PR. It overlaps the Python engine on `day1/spike` (PR #2); which one to keep is undecided. No app yet.
- **Probe result: go.** Coverage is good for comedy, music and sports shows. Fit and love back work. The fit against reach trade-off shows up clearly for comedy shows. Reach v1 (top 50 podcast overlap) saturates and needs a v2. Details in `docs/qloo.md` under "Findings from real calls".
- **21 Oct:** every Qloo API feature checked on the hackathon server and mapped in `docs/qloo-map.md`. Quota raised to 10 a second and 50,000 a month.
- **Next:** reach v2 experiment (first checks 8 and 9 in `docs/qloo.md`), then the open decisions in `docs/plan.md`.

## Keeping this file current

When a decision is made, an API fact is verified or disproved, or the plan moves, update this file and the matching doc in the same change. Keep this file short and put detail in `docs/`. Mark an API fact as verified only after a real call to the hackathon server.
