# Plan (v1)

What we build by the **27 Oct freeze**, from the 22 Oct call. Only what the demo needs. The HTTP contract is [api.md](api.md). [features.md](features.md) is the long reference: use it for exact Qloo recipes and the checks behind them, not for scope. Anything not on this page is not in v1.

## v1 in one paragraph

Two pieces: the **engine** (Python, FastAPI, on Railway) and the **web app** (Next.js). The host types their show, picks it from a short list, and Echo shows their audience map, then 10 guests the audience will like, whose own fans are new to the show and would like it back. Each guest has a reason, an episode title and a two-line pitch; a click opens the full episode idea and what that guest would add to the audience map. The host can talk to Echo ("I want younger listeners", "someone less famous", "an episode about a film") and Echo re-runs with new filters. The host picks one or more guests and gets a personal invitation draft for each, plus a briefing before recording. Echo sends nothing.

## The flow

1. **Find the show.** Qloo `/search` for podcasts, up to 5 results with image and description. The host picks one. A show Qloo doesn't have, or one with too little data, gets one message ("Echo can't analyse this show yet") and the featured shows. No stand-in path in v1.
2. **Audience map.** What the show's audience likes more than average across music, film, TV, books, brands and podcasts.
3. **Candidates.** The people the audience likes most, plus a second list with fame capped, so it isn't only celebrities.
4. **Clean-up.** Drop people who have died, the show's hosts, duplicates, and (should) past guests.
5. **Score and rank.** Fit (fame-adjusted), love back, reach. Label each guest (sweet spot, safe, far, long shot, balanced). Evidence for each: shared tastes, podcasts their fans like that the show's don't, the age groups they bring.
6. **Ideas.** For the top 10: a one-line reason, an episode title and a two-line pitch, written from the evidence only.
7. **Details on click.** The full episode idea (segments and questions), and the guest's own audience map next to the show's, so the host sees what they'd add.
8. **Chat.** The host asks for a change in words. The LLM turns it into filters (fame, age group, country, episode about a film, artist or brand) and re-runs, or rewrites one guest's idea.
9. **Invite.** The host picks one or more guests. One draft each, revisable with an instruction ("shorter"). The web app shows the final text with a copy button.
10. **Briefing.** One page before recording: who the guest is, what their audience likes, where the two audiences meet, questions to ask.
11. **What Qloo saw.** Every Qloo call of the analysis, listed. Needed for the technical-use criterion.

Featured shows (3 or 4, precomputed) open instantly from the landing page.

## Not in v1

Shows Qloo doesn't have (stand-in shows, people or topics), Apple, Spotify and RSS links, the Telegram/OpenClaw bot, logins, sessions and tokens, SSE, rate-limit headers, sending or approving anything, check or compare named guests, mirror, past guests as a signal, grow toward an interest audience, a city or another show, topic tags as anchors, the plain-AI comparison and backtest as features (make them offline for the pitch if there's time), an after-episode summary.

## Engine tasks

The engine splits in two, one person each. **Q** is everything that talks to Qloo and does the maths. **L** is everything that talks to the LLM. They meet in Python: Q's pipeline returns an `Analysis` dict (the shape in [api.md](api.md)), L's functions take it and add text. Until L is ready, Q uses stubs that return placeholder text; until Q is ready, L works on the example in api.md.

### Q: Qloo side

| # | Task | Recipe | Days | |
| --- | --- | --- | --- | --- |
| Q1 | Qloo client ready: throttle, disk cache, quota count, per-analysis call log, `videogame` type, the signals the pipeline needs allowed in `params.py` | features.md section 3, decision 3 | 0.25 | must |
| Q2 | `GET /shows`: Qloo search for podcasts, 5 results | F1 step 3 | 0.25 | must |
| Q3 | Audience map: 6 categories, top items with affinity | F5 | 0.5 | must |
| Q4 | Candidates (plain and fame-capped) and clean-up: dead, duplicates, hosts (calls L1) | F6, F7 | 0.5 | must |
| Q5 | Fit, love back, reach, Echo score, labels, ranking, as pure functions with tests on invented data | F8 to F10, section 2 | 1 | must |
| Q6 | Evidence for the top 10: shared tags (allow-listed subtypes only), new podcasts, age groups | F11, F16 | 0.5 | must |
| Q7 | Filters: fame ceiling, grow toward an age group, grow toward a country, episode about an entity | F12 b1 and b3, F13 c2, F15 | 0.5 | must |
| Q8 | Guest details: the guest's own audience map (6 calls, on click, cached) | F5 with the guest as signal | 0.25 | must |
| Q9 | Routes in [api.md](api.md), analyses run in the background and are polled, a daily cap on new analyses, featured shows precomputed at start, deploy to Railway | | 0.75 | must |
| Q10 | Past guests: match L6's names to Qloo people and drop them | F4 | 0.25 | should |

About 4.75 days.

### L: LLM side

| # | Task | Days | |
| --- | --- | --- | --- |
| L1 | Host check: from the show's title and Qloo description, which candidates are hosts or regular co-hosts | 0.25 | must |
| L2 | Ideas for the top 10 in one call: reason, episode title, two-line pitch, from the evidence only | 0.5 | must |
| L3 | Details: the full episode idea for one guest | 0.25 | must |
| L4 | Chat: messages plus the current filters in; the model calls one of three tools (re-run with filters, rewrite one idea, just answer) and replies | 1 | must |
| L5 | Invitation drafts for 1 to 5 guests, and revise with an instruction | 0.5 | must |
| L6 | Briefing for one guest | 0.25 | must |
| L7 | Past guests: names from the show's recent episode titles (Apple lookup by the iTunes ID Qloo gives) | 0.25 | should |

About 3 days. L has the lighter half, so L also starts the web app on the api.md example on day 1.

Rules for every prompt: write only from the evidence passed in, never invent facts about a person, never mention sensitive traits, never call a match a prediction about one listener. Model `claude-sonnet-5-5`, prompts kept as plain strings in the engine.

## Dates

| Date | Q | L |
| --- | --- | --- |
| 22 to 23 Oct | Q1 to Q4 | L1, L2, web app on the example |
| 24 Oct | Q5 to Q7 | L3, L4 |
| 25 Oct | Q8, Q9, deploy | L5, L6, web app on the live engine |
| 26 Oct | Q10, featured shows, the investor judge's show end to end | L7, fixes |
| 27 Oct | **Freeze** | |
| 27 to 30 Oct | Together: Devpost text, README, screenshots, repo public, submit on 29 Oct | |

## To agree

1. **The bot.** The pitch says Echo works through OpenClaw. v1 has no bot: the chat in the web app is the agent. Either change the pitch line, or add the bot after the freeze if both halves are done early.
2. **Who takes Q and who takes L.** The Python Qloo client already exists on `day1/spike`, so its author taking Q is the quickest start.
3. **Featured shows.** Pick 3 or 4 by 25 Oct (features.md decision 12).
