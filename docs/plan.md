# Plan (v1)

What we build by the **27 Oct freeze**, from the 22 Oct call. Only what the demo needs: anything not on this page is not in v1. The Qloo calls and the scoring are in [qloo.md](qloo.md).

## v1

Two pieces: the **engine** (Python, FastAPI) and the **web app** (Next.js). Where each is hosted isn't decided (point 4 under To agree). The host types their show, picks it from a short list, and sees their audience map and 10 guests the audience will like, whose fans are new to the show and would like it back. Each guest has a reason, an episode title and a two-line pitch; a click opens the full episode idea and what that guest would add to the audience map. The host can ask for changes in a chat ("younger listeners", "less famous", "an episode about a film") and Echo runs again. The host picks one or more guests and gets an invitation draft for each, plus a briefing. Echo sends nothing.

1. **Find the show.** Qloo search, up to 5 podcasts with image and description; the host picks one. A show Qloo doesn't have, or one with too little data, gets "Echo can't analyse this show yet" and the featured shows.
2. **Audience map** across music, film, TV, books, brands and podcasts.
3. **Candidates:** the people the audience likes most, plus a fame-capped list.
4. **Clean-up:** drop people who have died, hosts, duplicates and (should) past guests.
5. **Score and rank:** fit (fame-adjusted), love back, reach, a label, and evidence (shared tastes, new podcasts, age groups).
6. **Ideas** for the top 10: reason, episode title, two-line pitch.
7. **Details** on click: the full episode idea, and the guest's audience map next to the show's.
8. **Chat:** the LLM turns a request into filters (fame, age group, country, episode about a film, artist or brand) and runs again, or rewrites one idea.
9. **Invite:** drafts for the picked guests, revisable ("shorter"), shown with a copy button.
10. **Briefing** before recording.
11. **What Qloo saw:** every Qloo call of the analysis.

3 or 4 featured shows, precomputed, open instantly from the landing page.

**Not in v1:** shows Qloo doesn't have, pasting Apple, Spotify or RSS links, the Telegram/OpenClaw bot, logins, sessions, SSE, sending or approving, checking a named guest, grow toward interests, cities or another show, topic tags, the plain-AI comparison (make it offline for the pitch if there's time), an after-episode summary.

## Engine tasks

One person each. **Q** talks to Qloo and does the maths. **L** talks to the LLM. They meet in Python, in `engine/echo_engine/`:

| File | Owner | What's in it |
| --- | --- | --- |
| `models.py` | both | The API shapes below as Pydantic models. Change them together. |
| `app.py` | Q | The routes, background runs and mock mode. Done as a skeleton. |
| `pipeline.py` | Q | `search_shows`, `get_show`, `run_analysis`, `guest_maps`. Stubs. `run_analysis` calls L1 and L2. |
| `llm.py` | L | `find_hosts`, `write_ideas`, `write_episode`, `chat`, `write_drafts`, `write_briefing`, `past_guest_names`. Stubs. |
| `qloo_client.py`, `params.py` | Q | The Qloo client. |
| `fixtures/example.json` | both | Invented example data for mock mode and tests. |

With `ECHO_MOCK=1` every route answers from the example, so the web app and the LLM prompts can be built before the pipeline works. Without it, a stub returns 501 `not_implemented` until it's built.

| # | Q: Qloo side | Days | |
| --- | --- | --- | --- |
| Q1 | Client ready: throttle, cache, quota count, a call log per analysis, `params.py` allows the signals below | 0.25 | done |
| Q2 | `GET /shows` | 0.25 | done |
| Q3 | Audience map | 0.5 | done |
| Q4 | Candidates, usability check and clean-up: hosts from Apple's author line and the title, plus L1 when built | 0.5 | done |
| Q5 | Fit, love back, reach, Echo score, labels, order: pure functions, tested on invented data | 1 | done |
| Q6 | Evidence for the top 10, with the tag allow-list and name screen | 0.5 | done |
| Q7 | Filters: fame, age, country, episode about | 0.5 | done |
| Q8 | Guest details: the guest's audience map and what it adds | 0.25 | done |
| Q9 | Routes, background runs and polling, daily cap, featured shows warmed at start (`ECHO_FEATURED`), deploy | 0.75 | done except the deploy. The Vercel option also needs Postgres and Redis, about a day more ([Hosting options](#hosting-options)). |
| Q10 | Drop past guests: candidates whose full name is in one of the last 200 episode titles on Apple | 0.25 | done |

| # | L: LLM side | Days | |
| --- | --- | --- | --- |
| L1 | Host check: which candidates are the show's hosts or regular co-hosts | 0.25 | must |
| L2 | Ideas for the top 10 in one call | 0.5 | must |
| L3 | The full episode idea for one guest | 0.25 | must |
| L4 | Chat: three tools (run again with filters, rewrite one idea, just answer) | 1 | must |
| L5 | Drafts for 1 to 5 guests, and revise | 0.5 | must |
| L6 | Briefing | 0.25 | must |
| L7 | Past guests whose names Q10's exact match misses (could; Q10 already catches most) | 0.25 | could |

Q is about 4.75 days, L about 3, so L also starts the web app on day 1. Q status on 23 Oct: everything but the deploy is built and checked on 7 real shows (see qloo.md, "Pipeline runs"). `scripts/analyze.py "<show>"` runs it from the terminal. Every prompt writes only from the evidence it's given, never invents facts about a person, never mentions sensitive traits and never calls a match a prediction about one listener. The LLM provider and model aren't chosen yet (point 5 under To agree).

## Dates

| Date | Q | L |
| --- | --- | --- |
| 23 Oct | Q1 to Q4 | L1, L2, web app on the example |
| 24 Oct | Q5 to Q7 (done); first deploy once hosting is chosen | L3, L4 |
| 25 Oct | Q8, Q9, deploy | L5, L6, web app on the live engine |
| 26 Oct | Featured shows, the investor judge's show end to end | Fixes |
| 27 Oct | **Freeze** | |
| 27 to 29 Oct | Together: Devpost text, README, screenshots, repo public, submit | |

## To agree

1. **The bot.** The pitch says Echo works through OpenClaw; v1's agent is the chat. Change the pitch line, or add the bot after the freeze if both halves finish early.
2. **Who takes Q and who takes L.** The author of the Python Qloo client gets the quickest start on Q.
3. **Featured shows** by 25 Oct: comedy, music, sports and a business or tech interview show, each with at least 3 sweet spots. Consider the investor judge's own show for the last slot; its title goes in an env var, never the repo.
4. **Engine hosting.** Not decided. Two options, under Hosting options below: Eleni's Vercel plan (PR #4) or Railway.
5. **LLM provider and model.** Not researched or decided. The L tasks need structured output (ideas, drafts, chat decisions), tool or function calling for the chat, and a cost and speed that suit one call per step. Compare the options before L starts; the prompts stay plain strings in `llm.py` either way.

## Hosting options

Not decided (point 4 under To agree). The web app goes on Vercel either way. The engine today keeps its Qloo cache, saved analyses and daily count on disk in `.cache/` and runs analyses in the background of one process.

### Vercel (Eleni's proposal, PR #4)

Both pieces run on Vercel (Pro plan), as two projects from this repo: `engine/` and `web/`. A Vercel function keeps nothing between requests and several instances can run at once, so what one Railway process and its volume would have held goes to two Marketplace stores, both in `iad1` next to the engine:

| What | Where |
| --- | --- |
| Analyses, featured analyses | Neon Postgres, as JSON |
| Qloo cache | Neon Postgres, gzipped, with an expiry. Check its size on the first deploy. |
| Qloo throttle (under 10 a second across all instances), daily cap | Upstash Redis |

- **Background runs.** `POST /analyses` answers 202 and the run goes on in the same function, inside the 300 s default. Check on the first deploy that Vercel keeps the instance alive until the run ends; if it doesn't, the run moves to Vercel Queues. The run writes the analysis to Postgres after every step, because a poll can land on another instance.
- **Featured shows.** There's no startup on Vercel, so a script warms them once after each scoring change and writes them to Postgres.
- **Locally** nothing changes: without `DATABASE_URL` and the Upstash variables, the engine keeps the disk cache in `.cache/` and analyses in memory.
- **Env vars** on the engine project: `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, plus the ones in `.env.example`. `ECHO_CACHE_DIR` is for local runs only.
- Set a spend limit on the Vercel team before the first deploy.

### Railway

The engine runs as it is: one always-on process with a persistent volume for `.cache/`, deployed from GitHub, about $5 a month on the Hobby plan, and it doesn't sleep during judging. Fly.io works the same way. Nothing in the engine changes; the cost is a second platform next to Vercel.

## API

JSON, no auth, CORS for the web app. Errors are `{ "error": "<code>", "message": "<text for the host>" }`. Examples are invented, never Qloo data.

| Method | Path | Body or params | Returns |
| --- | --- | --- | --- |
| GET | `/health` | | `{ ok, qloo_calls_today, qloo_calls_left }` |
| GET | `/shows` | `q` (2 to 100 chars, on submit, not per keystroke) | `{ shows: [Show] }`, up to 5. Empty: not in Qloo. |
| GET | `/featured` | | `{ featured: [{ show: Show, analysis_id }] }` |
| POST | `/analyses` | `{ show_id, filters }` | 202 `{ id, status: "running" }`. Same show and filters reuse the earlier one. |
| GET | `/analyses/{id}` | | The analysis below. Poll once a second while running. |
| GET | `/analyses/{id}/guests/{ref}` | | `{ ref, audience_map, adds, episode: { title, summary, segments: [{ title, points }], questions } or null }` |
| POST | `/chat` | `{ analysis_id, messages: [{ role, content }] }`, the last 20 | `{ reply, action, analysis_id?, guest_ref?, idea? }` |
| POST | `/drafts` | `{ analysis_id, guest_refs, host_name?, note? }`, or one ref with `previous: { subject, body }` and `instruction` | `{ drafts: [{ guest_ref, subject, body }] }` |
| POST | `/briefings` | `{ analysis_id, guest_ref }` | `{ markdown }` |

`Show` is `{ id, title, description, image_url }`.

`filters`: `fame` is `any`, `less_famous` or `rising`; `age` is null or a Qloo age bucket (`24_and_younger` to `55_and_older`); `country` is null or an English country name; `episode_about` is null or `{ query, type }` with type `movie`, `tv_show`, `artist`, `brand` or `videogame`.

Chat `action`: `rerun` (poll the new `analysis_id`), `rewrite` (`guest_ref` and the new `idea`) or `none`.

The analysis, when done:

```json
{
  "id": "an_00000002",
  "status": "done",
  "show": { "id": "00000000-0000-0000-0000-000000000001", "title": "Example Show", "description": "A weekly interview show about food.", "image_url": "https://example.com/show.jpg" },
  "filters": { "fame": "any", "age": null, "country": null, "episode_about": { "query": "Example Film", "type": "movie", "used": "Example Film (2019)" } },
  "steps": [{ "key": "map", "label": "Mapping your audience", "done": true }],
  "audience_map": [{ "category": "music", "items": [{ "name": "Example Band", "image_url": "https://example.com/band.jpg", "affinity": 0.93 }] }],
  "guests": [
    {
      "ref": "g1",
      "id": "00000000-0000-0000-0000-0000000000a1",
      "name": "Guest A",
      "description": "Stand-up comedian and actor",
      "image_url": "https://example.com/a.jpg",
      "links": { "imdb": "https://www.imdb.com/name/nm0000001/" },
      "label": "sweet_spot",
      "scores": { "fit": 0.74, "love_back": 0.41, "reach": 0.52, "echo": 0.55 },
      "evidence": { "shared_tastes": ["Example tag"], "new_podcasts": ["Example Podcast B"], "ages": ["25_to_29", "30_to_34"] },
      "idea": { "reason": "Your listeners and Guest A's fans both over-index on example tag.", "title": "Example episode title", "pitch": "Two sentences on the episode." }
    }
  ],
  "left_out": [{ "name": "Host Person", "why": "host" }],
  "qloo_calls": [{ "path": "/v2/insights", "params": { "filter.type": "urn:entity:person", "take": "50" }, "status": 200, "duration_ms": 412, "cached": false, "at": "2026-10-23T10:00:01+00:00" }]
}
```

- While running: the same shape, with `steps` (`map`, `candidates`, `clean`, `score`, `evidence`, `ideas`) turning `done` and the lists still empty.
- `guests`: up to 20, best first, all on the chart. The top 10 have `evidence` and `idea`; the rest have null.
- `scores` are percentiles from 0 to 1 ([qloo.md](qloo.md#scoring)). `fit` is fame-adjusted.
- `episode_about.used` is null when Qloo couldn't use the entity; the web app says so.
- `left_out.why` is `host` or `past_guest`. People who have died are dropped silently.
- `id` on a guest is the Qloo entity ID. `idea` and `episode` stay null until the LLM side writes them.
- Failed: `"status": "failed"` with `"error": { "error": "<code>", "message": "<text for the host>" }`. Codes: `show_unusable` (too few people, or love back can't be scored), `unknown_country`, `filters_too_narrow` (no guests match), `qloo_error`, `engine_error`.

| Status | `error` |
| --- | --- |
| 400 | `bad_request` |
| 404 | `not_found` |
| 429 | `daily_cap`: the daily Qloo-call cap (`ECHO_DAILY_QLOO_CALLS`) is reached. Featured and earlier analyses still open. |
| 501 | `not_implemented`: a stub that isn't built yet. Gone by the freeze. |
| 502 | `qloo_error`, `llm_error` |

Analyses are saved as JSON next to the Qloo cache: in `.cache/` today, or in Postgres in the Vercel option ([Hosting options](#hosting-options)). Only the search text and filter values reach Qloo; the host's name and notes go to the LLM only. A guest is shown with name, description, image and links, never gender, birth date or family.
