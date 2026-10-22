# Workstreams

How the two of us could split the work. **Nothing is assigned yet.** What each part must do, its priority and its build order are in [features.md](features.md) (section 1, and decision 20 in section 6); the HTTP contract between the parts is [api.md](api.md).

Goal: implementation done by **27 Oct**, leaving 27 to 30 Oct for the pitch and submission.

## 1. Matching engine (`engine/`, ~2.5 days)

- Client changes first: priority dispatcher, scrubber, timeouts, gzip cache, per-job ceiling, relaxed param checks ([features.md](features.md) section 3 and decision 3).
- The F1 to F11 pipeline: show lookup, proxy, audience map, candidates, filters, fit, love back, reach, who the new listeners are.
- Scoring as pure functions with tests on invented data ([features.md](features.md) section 2, [api.md](api.md) section 8).
- LLM text from the evidence only: reasons, episode themes, invitation draft, briefing.

Done when `POST /analyses` turns a show into ranked, explained matches.

## 2. API and hosting (~1 day)

- FastAPI serving [api.md](api.md): analyses, SSE progress, drafts and approval, briefings, the Qloo call log, GET forms for the bot.
- Featured-show warm-up, limits, Railway deploy with a volume, up until 30 Nov.

Done when a public URL answers the contract.

## 3. Web app (~3 days)

- Show input, live "agent at work" cards, audience map, match cards (fit, love back, reach, reason, themes), invitation draft with approval, briefing, "What Qloo saw" panel.
- Empty and error states, phone width, brand.
- Next.js (proposed). Starts now on the mock fixtures in [api.md](api.md) section 8.

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
api.md fixtures ──► 3 web app, 4 agent
1 engine ──► 2 API ──► 5 evidence ──► 6 pitch
```

| Date | Milestone |
| --- | --- |
| 22 Oct | Contract agreed (features.md section 6) and split chosen; engine, web app and bot start, the last two on mock fixtures |
| 23 to 24 Oct | Engine musts done; API live; agent works locally |
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

1. The decisions in [features.md](features.md) section 6, including the web stack (17), hosting (14) and age only, no gender (4).
2. One pitch text: the brief's version and `echo.md` differ slightly.
3. The split above.
