# Plan (v1)

What we build by the **27 Oct freeze**, from the 22 Oct call. Only what the demo needs: anything not on this page is not in v1. The Qloo calls and the scoring are in [qloo.md](qloo.md).

## v1

Two pieces: the **engine** (Python, FastAPI, on Railway) and the **web app** (Next.js). The host types their show, picks it from a short list, and sees their audience map and 10 guests the audience will like, whose fans are new to the show and would like it back. Each guest has a reason, an episode title and a two-line pitch; a click opens the full episode idea and what that guest would add to the audience map. The host can ask for changes in a chat ("younger listeners", "less famous", "an episode about a film") and Echo runs again. The host picks one or more guests and gets an invitation draft for each, plus a briefing. Echo sends nothing.

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

**Not in v1:** shows Qloo doesn't have, Apple, Spotify or RSS links, the Telegram/OpenClaw bot, logins, sessions, SSE, sending or approving, checking a named guest, grow toward interests, cities or another show, topic tags, the plain-AI comparison (make it offline for the pitch if there's time), an after-episode summary.

## Engine tasks

One person each. **Q** talks to Qloo and does the maths. **L** talks to the LLM. They meet in Python: Q's pipeline builds the analysis dict (the shape under API below) and L's functions take it and add text. Until the other half is ready, each works against the example in this page.

| # | Q: Qloo side | Days | |
| --- | --- | --- | --- |
| Q1 | Client ready: throttle, cache, quota count, a call log per analysis, `params.py` allows the signals below | 0.25 | must |
| Q2 | `GET /shows` | 0.25 | must |
| Q3 | Audience map | 0.5 | must |
| Q4 | Candidates, usability check and clean-up (calls L1 for hosts) | 0.5 | must |
| Q5 | Fit, love back, reach, Echo score, labels, order: pure functions, tested on invented data | 1 | must |
| Q6 | Evidence for the top 10, with the tag allow-list and name screen | 0.5 | must |
| Q7 | Filters: fame, age, country, episode about | 0.5 | must |
| Q8 | Guest details: the guest's audience map and what it adds | 0.25 | must |
| Q9 | Routes, background runs and polling, daily cap, featured shows warmed at start, Railway | 0.75 | must |
| Q10 | Drop past guests: match L7's names to Qloo people | 0.25 | should |

| # | L: LLM side | Days | |
| --- | --- | --- | --- |
| L1 | Host check: which candidates are the show's hosts or regular co-hosts | 0.25 | must |
| L2 | Ideas for the top 10 in one call | 0.5 | must |
| L3 | The full episode idea for one guest | 0.25 | must |
| L4 | Chat: three tools (run again with filters, rewrite one idea, just answer) | 1 | must |
| L5 | Drafts for 1 to 5 guests, and revise | 0.5 | must |
| L6 | Briefing | 0.25 | must |
| L7 | Past guests: names from the show's recent episode titles (Apple lookup by the iTunes ID Qloo gives) | 0.25 | should |

Q is about 4.75 days, L about 3, so L also starts the web app on day 1. Every prompt writes only from the evidence it's given, never invents facts about a person, never mentions sensitive traits and never calls a match a prediction about one listener. Model `claude-sonnet-5-5`.

## Dates

| Date | Q | L |
| --- | --- | --- |
| 23 Oct | Q1 to Q4 | L1, L2, web app on the example |
| 24 Oct | Q5 to Q7 | L3, L4 |
| 25 Oct | Q8, Q9, deploy | L5, L6, web app on the live engine |
| 26 Oct | Q10, featured shows, the investor judge's show end to end | L7, fixes |
| 27 Oct | **Freeze** | |
| 27 to 29 Oct | Together: Devpost text, README, screenshots, repo public, submit | |

## To agree

1. **The bot.** The pitch says Echo works through OpenClaw; v1's agent is the chat. Change the pitch line, or add the bot after the freeze if both halves finish early.
2. **Who takes Q and who takes L.** The author of the Python Qloo client gets the quickest start on Q.
3. **Featured shows** by 25 Oct: comedy, music, sports and a business or tech interview show, each with at least 3 sweet spots. Consider the investor judge's own show for the last slot; its title goes in an env var, never the repo.

## API

JSON, no auth, CORS for the web app. Errors are `{ "error": "<code>", "message": "<text for the host>" }`. Examples are invented, never Qloo data.

| Method | Path | Body or params | Returns |
| --- | --- | --- | --- |
| GET | `/health` | | `{ ok, qloo_calls_today, qloo_calls_left }` |
| GET | `/shows` | `q` (2 to 100 chars, on submit, not per keystroke) | `{ shows: [Show] }`, up to 5. Empty: not in Qloo. |
| GET | `/featured` | | `{ featured: [{ show: Show, analysis_id }] }` |
| POST | `/analyses` | `{ show_id, filters }` | 202 `{ id, status: "running" }`. Same show and filters reuse the earlier one. |
| GET | `/analyses/{id}` | | The analysis below. Poll once a second while running. |
| GET | `/analyses/{id}/guests/{ref}` | | `{ ref, audience_map, adds, episode: { title, summary, segments: [{ title, points }], questions } }` |
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
  "qloo_calls": [{ "path": "/v2/insights", "params": { "filter.type": "urn:entity:person", "take": "50" }, "results": 50, "ms": 412, "cached": false }]
}
```

- Steps while running: `map`, `candidates`, `clean`, `score`, `evidence`, `ideas`.
- `guests`: up to 20, best first, all on the chart. The top 10 have `evidence` and `idea`; the rest have null.
- `scores` are percentiles from 0 to 1 ([qloo.md](qloo.md#scoring)). `fit` is fame-adjusted.
- `episode_about.used` is null when Qloo couldn't use the entity; the web app says so.
- `left_out.why` is `host` or `past_guest`. People who have died are dropped silently.
- Failed: `"status": "failed"` with `"error": { "error": "show_unusable", "message": "Echo can't analyse this show yet." }`, or `qloo_error`.

| Status | `error` |
| --- | --- |
| 400 | `bad_request`, `unknown_country` |
| 404 | `not_found` |
| 429 | `daily_cap`: the daily Qloo-call cap (`ECHO_DAILY_QLOO_CALLS`) is reached. Featured and earlier analyses still open. |
| 502 | `qloo_error`, `llm_error` |

Analyses are saved as JSON on the Railway volume next to the Qloo cache, so they survive restarts. Only the search text and filter values reach Qloo; the host's name and notes go to the LLM only. A guest is shown with name, description, image and links, never gender, birth date or family.
