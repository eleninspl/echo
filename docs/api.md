# Echo engine API (v1)

The contract between the engine (Python, FastAPI, on Railway) and the web app. Scope and tasks are in [plan.md](plan.md). How each value is computed is in [features.md](features.md). The long proposal of 21 Oct is in git history (commit 3419283) if we ever need it.

Every example uses invented values ("Example Show", "Guest A", UUIDs like `00000000-0000-0000-0000-000000000001`). None of it is Qloo data. Keep it that way: the repo goes public.

## Basics

- JSON in and out. No auth, no sessions. CORS allows the web app's origin.
- Errors: `{ "error": "<code>", "message": "<text for the host>" }`.
- A daily cap on Qloo calls (`ECHO_DAILY_QLOO_CALLS`). Once it is reached, new analyses get 429 `daily_cap`. Featured and already-run analyses still open.
- The same show with the same filters reuses the earlier analysis.
- Analyses are saved as JSON on the Railway volume, next to the Qloo cache, so they survive a restart. Nothing goes in the repo.

## Endpoints

| Method | Path | What it does | Qloo calls |
| --- | --- | --- | --- |
| GET | `/health` | Up, Qloo calls used today, calls left | 0 |
| GET | `/shows?q=` | Up to 5 podcasts matching the text | 1, cached |
| GET | `/featured` | The featured shows and their analyses | 0 |
| POST | `/analyses` | Start an analysis | about 58 |
| GET | `/analyses/{id}` | Progress while running, the result when done | 0 |
| GET | `/analyses/{id}/guests/{ref}` | One guest's details | 6, cached |
| POST | `/chat` | Talk to Echo about an analysis | 0, or a new analysis |
| POST | `/drafts` | Invitation drafts, or a revision of one | 0 |
| POST | `/briefings` | A briefing for one guest | 0 |

## GET /shows?q=

`q` is 2 to 100 characters. The web app calls it on submit, not on every keystroke.

```json
{
  "shows": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "title": "Example Show",
      "description": "A weekly interview show about food and travel.",
      "image_url": "https://example.com/show.jpg"
    }
  ]
}
```

An empty list means Qloo doesn't have the show. The web app says so and offers the featured shows.

## GET /featured

```json
{
  "featured": [
    { "show": { "id": "…", "title": "Example Show", "description": "…", "image_url": "…" }, "analysis_id": "an_00000001" }
  ]
}
```

## POST /analyses

```json
{
  "show_id": "00000000-0000-0000-0000-000000000001",
  "filters": {
    "fame": "any",
    "age": null,
    "country": null,
    "episode_about": null
  }
}
```

| Filter | Values |
| --- | --- |
| `fame` | `any` (default), `less_famous` (popularity up to 0.7), `rising` (up to 0.4) |
| `age` | null, or one of `24_and_younger`, `25_to_29`, `30_to_34`, `35_to_44`, `45_to_54`, `55_and_older` |
| `country` | null, or a country name in English. One Qloo can't resolve returns 400 `unknown_country`. |
| `episode_about` | null, or `{ "query": "Example Film", "type": "movie" }`. Types: `movie`, `tv_show`, `artist`, `brand`, `videogame`. The engine uses the top search result and reports it in the result. |

Response, 202:

```json
{ "id": "an_00000002", "status": "running" }
```

## GET /analyses/{id}

The web app polls once a second while `status` is `running`.

```json
{
  "id": "an_00000002",
  "status": "running",
  "steps": [
    { "key": "map", "label": "Mapping your audience", "done": true },
    { "key": "candidates", "label": "Finding guests", "done": true },
    { "key": "clean", "label": "Removing hosts and past guests", "done": false },
    { "key": "score", "label": "Scoring love back and reach", "done": false },
    { "key": "evidence", "label": "Collecting the evidence", "done": false },
    { "key": "ideas", "label": "Writing episode ideas", "done": false }
  ]
}
```

When done:

```json
{
  "id": "an_00000002",
  "status": "done",
  "show": { "id": "…", "title": "Example Show", "description": "…", "image_url": "…" },
  "filters": {
    "fame": "any",
    "age": null,
    "country": null,
    "episode_about": { "query": "Example Film", "type": "movie", "used": "Example Film (2019)" }
  },
  "steps": ["…all done…"],
  "audience_map": [
    {
      "category": "music",
      "items": [{ "name": "Example Band", "image_url": "…", "affinity": 0.93 }]
    }
  ],
  "guests": [
    {
      "ref": "g1",
      "name": "Guest A",
      "description": "Stand-up comedian and actor",
      "image_url": "…",
      "links": { "imdb": "https://www.imdb.com/name/nm0000001/" },
      "label": "sweet_spot",
      "scores": { "fit": 0.74, "love_back": 0.41, "reach": 0.52, "echo": 0.55 },
      "evidence": {
        "shared_tastes": ["Example tag", "Another example tag"],
        "new_podcasts": ["Example Podcast B", "Example Podcast C"],
        "ages": ["25_to_29", "30_to_34"]
      },
      "idea": {
        "reason": "Your listeners and Guest A's fans both love example tag.",
        "title": "Example episode title",
        "pitch": "Two sentences on what the episode would be."
      }
    }
  ],
  "left_out": [{ "name": "Host Person", "why": "host" }],
  "qloo_calls": [
    { "path": "/v2/insights", "params": { "filter.type": "urn:entity:person", "take": "50" }, "results": 50, "ms": 412, "cached": false }
  ]
}
```

- `guests`: up to 20, best first. The top 10 have `evidence` and `idea`; the rest have both null and still go on the chart.
- `scores`: 0 to 1, higher is better. `fit` is fame-adjusted. The chart is reach (x) against fit (y), with love back as the dot size.
- `label`: `sweet_spot`, `safe`, `far`, `long_shot` or `balanced`.
- `left_out.why`: `host` or `past_guest`. People who have died are dropped without a mention.
- `qloo_calls` feeds "What Qloo saw".

Failed: `{ "id": "…", "status": "failed", "error": { "error": "show_unusable", "message": "Echo can't analyse this show yet." } }`. `show_unusable` covers too few people or love back that can't be scored.

## GET /analyses/{id}/guests/{ref}

```json
{
  "ref": "g1",
  "audience_map": [{ "category": "music", "items": [{ "name": "Example Singer", "image_url": "…", "affinity": 0.88 }] }],
  "adds": [{ "category": "music", "items": [{ "name": "Example Singer", "image_url": "…", "affinity": 0.88 }] }],
  "episode": {
    "title": "Example episode title",
    "summary": "A paragraph.",
    "segments": [{ "title": "Opening", "points": ["…"] }],
    "questions": ["…"]
  }
}
```

`audience_map` is the guest's own, in the show's categories. `adds` is what in it the show's map doesn't have, for the "what they'd bring" view.

## POST /chat

The web app sends the whole conversation each time (the last 20 messages). The engine keeps no chat state.

```json
{
  "analysis_id": "an_00000002",
  "messages": [{ "role": "user", "content": "Who would bring younger listeners?" }]
}
```

```json
{
  "reply": "Here are guests whose fans lean 25 to 34.",
  "action": "rerun",
  "analysis_id": "an_00000003"
}
```

| `action` | Meaning |
| --- | --- |
| `rerun` | A new analysis with changed filters has started. Poll `analysis_id`. |
| `rewrite` | One idea was rewritten: the response also has `guest_ref` and the new `idea`. |
| `none` | Just an answer. |

## POST /drafts

```json
{
  "analysis_id": "an_00000002",
  "guest_refs": ["g1", "g3"],
  "host_name": "Sam",
  "note": "We record remotely in December."
}
```

```json
{
  "drafts": [
    { "guest_ref": "g1", "subject": "An invitation to Example Show", "body": "…" }
  ]
}
```

1 to 5 guests. To revise one, send a single `guest_refs` entry with `"previous": { "subject": "…", "body": "…" }` and `"instruction": "shorter"`. `host_name` and `note` go to the LLM only, never to Qloo. Echo sends nothing: the web app shows the text with a copy button.

## POST /briefings

```json
{ "analysis_id": "an_00000002", "guest_ref": "g1" }
```

```json
{ "markdown": "# Guest A\n\n…" }
```

Runs the guest details first if they aren't cached.

## Errors

| Status | `error` |
| --- | --- |
| 400 | `bad_request`, `unknown_country` |
| 404 | `not_found` |
| 422 | `show_unusable` |
| 429 | `daily_cap` |
| 502 | `qloo_error`, `llm_error` |

## Data rules

- Only the search text and filter values reach Qloo. Nothing about the host or a listener does.
- A guest is shown with name, description, image and links only. Never gender, birth date or family, even though Qloo returns them.
- Shared tastes use an allow-list of tag subtypes (features.md F16).
