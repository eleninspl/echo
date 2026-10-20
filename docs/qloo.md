# Qloo for Echo

Qloo holds a taste graph of more than 250 million things people like, across music artists, film, TV, books, podcasts, games, people, places, brands and destinations. Given a few things an audience likes, it predicts what else that audience is likely to enjoy, including in other categories. It answers from patterns across large groups and holds no accounts for individuals.

Sources: the [hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide) and the reference pages it links to. Facts marked **verified** were confirmed with a real call to the hackathon server.

## What Echo uses it for

| Echo step | Call |
| --- | --- |
| Find the show | `/search` with `types=urn:entity:podcast` |
| Map the audience | `/v2/insights` with the show as `signal.interests.entities`, one call per `filter.type` (artist, book, movie, tv_show, brand, place) |
| Find candidates | `/v2/insights`, `filter.type=urn:entity:person`, show as signal |
| Fit | Candidate's `query.affinity` from the call above, or `filter.results.entities=<guest>` to score one guest directly |
| Love back | `/v2/insights`, `filter.type=urn:entity:podcast`, guest as signal, `filter.results.entities=<show>` |
| Reach | `/v2/analysis/compare` with the show as `a` and the guest as `b` |
| Who the new listeners are | `/v2/insights`, `filter.type=urn:demographics`, guest as signal |
| Episode theme | `/v2/insights`, `filter.type=urn:tag` (taste analysis) for show and guest, then the tags they share |

## Basics

- Base URL: `https://hackathon.api.qloo.com`. **Verified.** Hackathon keys get 401 on `api.qloo.com` and `staging.api.qloo.com`.
- Auth: `X-Api-Key` header. **Verified.**
- Every call is GET with params in the query string. POST to `/v2/insights` fails with "No path matching request parameters".
- Recommended flow: get IDs from `/search` (entities) or `/v2/tags` (tags), then pass them to `/v2/insights`.

## Endpoints

### `GET /search`: find entity IDs by name (**verified**)

Params: `query`, `types`, `take`, `page`, `sort_by` (`match`, `distance`, `popularity`), `filter.popularity`, `filter.tags`, `filter.location`, `filter.radius`.

Response: `{ results: [...] }`. Each result has `entity_id`, `name`, `types`, `popularity` (0 to 1), `tags`, `disambiguation`, `properties` (`short_description`, `short_descriptions`, `image`, `external`).

### `GET /v2/insights`: recommendations and analysis (**verified** for people)

`filter.type` is required. Values from the hackathon guide: `urn:entity:artist`, `urn:entity:book`, `urn:entity:brand`, `urn:entity:destination`, `urn:entity:movie`, `urn:entity:person`, `urn:entity:place`, `urn:entity:podcast`, `urn:entity:tv_show`, `urn:entity:video_game`. Also `urn:demographics` (audience makeup) and `urn:tag` (taste analysis). Music is `artist`, never `music`.

Params valid for person, podcast, artist, tv_show, movie, book and brand:

- Signals: `signal.interests.entities`, `signal.interests.tags`, `signal.demographics.age`, `signal.demographics.gender`, `signal.demographics.audiences`, `signal.demographics.audiences.weight`
- Filters: `filter.exclude.entities`, `filter.exclude.tags`, `operator.exclude.tags`, `filter.tags`, `operator.filter.tags`, `filter.popularity.min`, `filter.popularity.max` (0 to 1), `filter.results.entities`, `filter.results.entities.query`, `filter.parents.types`, `filter.external.exists`, `operator.filter.external.exists`
- Other: `bias.trends`, `take` (1 to 50, default 20), `offset`, `page`, `feature.explainability`
- Person only: `filter.date_of_birth.min`, `filter.date_of_birth.max`, `filter.date_of_death.min`, `filter.date_of_death.max`, `filter.gender`

`filter.results.entities` limits results to the listed IDs. Use it to read one entity's affinity toward the input, which is how Echo scores fit and love back for a given guest.

`signal.demographics.age` values: `24_and_younger`, `25_to_29`, `30_to_34`, `35_to_44`, `45_to_54`, `55_and_older`. Gender: `male`, `female`.

Response (**verified**): `{ success, results: { entities: [...] }, query }`. Each entity has `entity_id`, `name`, `type`, `subtype`, `popularity`, `tags`, `properties`, `external`, `disambiguation`, and `query` with `affinity` (0 to 1), `explainability` and `measurements`.

### `GET /v2/analysis/compare`: what two sets of tastes share and where they differ

Params: `a.signal.interests.entities`, `b.signal.interests.entities` (both required), `filter.type`, `filter.subtype` (`urn:tag:occupation`, `urn:tag:genre`), `model` (`descriptive`, `predictive`), `take` (1 to 50), `page`, `offset`. Response shape not documented. Not yet called.

### `GET /v2/insights?filter.type=urn:demographics`: audience makeup

Pass an entity or tag as signal. Response: `results.demographics[]`, each with `entity_id`, `query.age` (score per age bucket) and `query.gender` (`male`, `female`). Positive means the group over-indexes, negative means it under-indexes. Not yet called.

### `GET /v2/insights?filter.type=urn:tag`: taste analysis

Returns tags tied to an entity. Combine with `signal.interests.entities`, `filter.tag.types` and `filter.parents.types`. Response: `results.tags[]` with `tag_id`, `name`, `types`, `subtype`, `tag_value`. The documented example has no score field. Not yet called.

### `GET /v2/tags`: find tag IDs by keyword

Tags must be IDs from here, never free text. There is no static tag list. Not yet called.

### `GET /entities?entity_ids=...`: look up entities by ID

Also accepts external IDs such as `external.spotify.ids`, `external.imdb.ids`, `external.wikidata.ids`. Not yet called.

## Findings from real calls

Results themselves are not written down here, because Qloo response data must not go into this repo.

- **20 Oct, a top celebrity-interview podcast → people (take 8):**
  - The picks were plausible for the show but every one was very famous (popularity above 0.85), which confirms the famous-names risk in `echo.md`. Try `filter.popularity.max`.
  - The top pick had died. Insights returns people who have died, so Echo must drop them. `properties` may carry a date of death; check.
  - Affinity scores were bunched tightly near the top of the 0 to 1 range, so raw affinity alone won't separate candidates much.
  - With a single input entity, explainability gives every result a score of 1, so it says nothing. Reasons for a match have to come from shared tags or compare.

## Errors

| Symptom | Cause |
| --- | --- |
| 401 | Wrong host. Use `hackathon.api.qloo.com`. |
| 401 "No API key found in request" | Key not in the `X-Api-Key` header. |
| 404 or no response | Base URL with no path. |
| "No path matching request parameters" | Used POST. |
| 403 "You do not have permission to access urn:entity:..." | Entity type not available. |
| "at least one valid signal or filter is required" | Invalid tag or audience IDs. |
| 200 with empty `entities` | A param isn't valid for that `filter.type` (silently ignored), or no data. |

## Limits and rules

- Rate and monthly quotas aren't published and are "set high enough". To raise them, post project details in Discord `#api-help`.
- Keys stay active through judging and are turned off after the hackathon.
- You can't trim response fields through the API. Verbose fields such as `akas` always come back.
- Private server-side caching is allowed with no time limit. **Never store Qloo response data in the public repo.** Cache in `.cache/` only.
- Results describe groups. No inferring identity, health, finances or politics. No personal data sent to Qloo. No bulk scraping.

## Reported by other teams, not yet checked by us

- Trend data is flat on the hackathon server and ends in September 2025.
- Heatmaps limited to an area's boundary return errors.

Echo doesn't depend on either.

## First checks

1. ~~Does a well-known podcast exist as a podcast entity?~~ Yes.
2. ~~Do people come back from a show as input?~~ Yes, with affinity scores.
3. Are the top people distinctive or just the most famous? Try `filter.popularity.max` and more shows (comedy, music, sports).
4. Does love back work: guest as input, `filter.type=urn:entity:podcast`, `filter.results.entities=<show>`?
5. What does `/v2/analysis/compare` return for a show and a guest?
6. Do `urn:demographics` and `urn:tag` return useful data for a podcast and a person?
7. How do we detect people who have died?
