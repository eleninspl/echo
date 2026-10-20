# Workstreams

The remaining work and possible ways to split it. **Nothing is assigned yet.**

Goal: implementation done by **27 Oct**, leaving 27 to 30 Oct for the pitch and submission.

## 1. Matching engine (`engine/`, ~2 days)

- Scoring: fit, love back, reach, rank-based (raw affinity is bunched near 1), sweet spot tuned per show.
- Filters: hosts, the deceased, duplicate names, past guests, optional "less famous" mode.
- Evidence per match: shared tastes, compare tags, explainability, the guest audience's podcasts.
- LLM text from that evidence only: why this guest, episode themes, invitation draft, briefing.
- Tests for scoring and filters.

Done when one function turns a show name into ranked, explained matches.

## 2. API and hosting (~1 day)

- API contract first (`docs/api.md`). It unblocks 3 and 4.
- FastAPI: shortlist, invitation, briefing, progress stream (SSE), Qloo call log, GET endpoints for OpenClaw (`web_fetch` is GET only).
- Cache warm-up for demo shows, rate limiting, deploy on Railway or Render, up until 16 Nov.

Done when a public URL answers the contract.

## 3. Web app (~3 days)

- Show input, live "agent at work" cards, audience map, match cards (fit, love back, reach, reason, themes), invitation draft with approval, briefing, "What Qloo saw" panel.
- Empty and error states, phone width, brand.
- Can start on mock data as soon as the contract exists. Stack undecided.

Done when a judge can go from a show name to an approved invitation.

## 4. OpenClaw agent and Telegram bot (~2 days)

- Skill with three commands: shortlist, draft invitation, briefing. API calls only, no shell or files, nothing sent without approval.
- Hosted gateway and public Telegram bot, with spending cap and rate limits.
- Install guide in `skill/README.md`.

Done when a judge can message the bot and get an approved invitation draft.

## 5. Evidence (~1.5 days)

- Backtest on 3 shows: guests known to have driven growth versus typical guests, from public sources. Honest about sample size.
- Plain LLM versus Echo on the same question.

Done when there is a chart and a short write-up.

## 6. Pitch and submission (~2 days, together)

Devpost text, final README, screenshots, demo shows, repo public, final end-to-end check.

## Order

```
2 contract ──► 3 web app, 4 agent
1 engine ──► 2 API ──► 5 evidence ──► 6 pitch
```

| Date | Milestone |
| --- | --- |
| 21 Oct | Contract agreed; engine and web app start |
| 22 to 24 Oct | API live; web app wired; agent works locally |
| 25 to 26 Oct | Web app deployed; bot hosted; backtest run |
| 27 Oct | Implementation freeze |
| 27 to 29 Oct | Pitch and polish; submit 29 Oct |

## Possible splits (not decided)

| | One side | Other side | Together |
| --- | --- | --- | --- |
| A. By layer | 1 + 2 | 3 | 4 and 5 to whoever is free first; 6 |
| B. By entry point | 1 + 2 + 3 | 4, then 5 | 6 |
| C. Data vs product | 1 + 5 | 3 + 4 | 2 contract; 6 |

- **A:** easiest parallel start; needs close coordination on the contract.
- **B:** the judged flow stays in one pair of hands; uneven load.
- **C:** clear ownership; both user-facing parts depend on an early, solid contract.

## To decide

1. Web app stack: Next.js on Vercel, or Vite + React.
2. Show audience age and gender (`urn:demographics`), or leave them out.
3. One pitch text: the brief's version and `echo.md` differ slightly.
