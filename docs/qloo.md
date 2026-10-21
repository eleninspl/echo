# Qloo for Echo

Qloo holds a taste graph of more than 250 million things people like, across music artists, film, TV, books, podcasts, games, people, places, brands and destinations. Given a few things an audience likes, it predicts what else that audience is likely to enjoy, including in other categories. It answers from patterns across large groups and holds no accounts for individuals.

Sources: the [hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide) and the reference pages it links to. Facts marked **verified** were confirmed with a real call to the hackathon server.

Every API feature and whether it works on the hackathon server: [qloo-map.md](qloo-map.md).

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

`filter.type` is required. Values from the hackathon guide: `urn:entity:artist`, `urn:entity:book`, `urn:entity:brand`, `urn:entity:destination`, `urn:entity:movie`, `urn:entity:person`, `urn:entity:place`, `urn:entity:podcast`, `urn:entity:tv_show`, `urn:entity:videogame`. The guide writes `video_game`, which returns 400 (**verified**). Also `urn:demographics` (audience makeup) and `urn:tag` (taste analysis). Music is `artist`, never `music`.

Params valid for person, podcast, artist, tv_show, movie, book and brand:

- Signals: `signal.interests.entities`, `signal.interests.tags`, `signal.demographics.age`, `signal.demographics.gender`, `signal.demographics.audiences`, `signal.demographics.audiences.weight`
- Filters: `filter.exclude.entities`, `filter.exclude.tags`, `operator.exclude.tags`, `filter.tags`, `operator.filter.tags`, `filter.popularity.min`, `filter.popularity.max` (0 to 1), `filter.results.entities`, `filter.results.entities.query`, `filter.parents.types`, `filter.external.exists`, `operator.filter.external.exists`
- Other: `bias.trends`, `take` (1 to 50, default 20), `offset`, `page`, `feature.explainability`
- Person only: `filter.date_of_birth.min`, `filter.date_of_birth.max`, `filter.date_of_death.min`, `filter.date_of_death.max`, `filter.gender`

`filter.results.entities` limits results to the listed IDs. Use it to read one entity's affinity toward the input, which is how Echo scores fit and love back for a given guest.

`signal.demographics.age` values: `24_and_younger`, `25_to_29`, `30_to_34`, `35_to_44`, `45_to_54`, `55_and_older`. Gender: `male`, `female`.

Response (**verified**): `{ success, results: { entities: [...] }, query }`. Each entity has `entity_id`, `name`, `type`, `subtype`, `popularity`, `tags`, `properties`, `external`, `disambiguation`, and `query` with `affinity` (0 to 1), `explainability` and `measurements`.

### `GET /v2/analysis/compare`: what two sets of tastes share and where they differ

Params: `a.signal.interests.entities`, `b.signal.interests.entities` (both required), `filter.type`, `filter.subtype` (`urn:tag:occupation`, `urn:tag:genre`), `model` (`descriptive`, `predictive`), `take` (1 to 50), `page`, `offset`.

Response (**verified**): `results.tags` (tags both sides share, each with `query.score`), `results.a` and `results.b` (tags only on one side, with `query.count`), `results.matchEntities`. Tags carry `tag_id`, `name`, `type`, `subtype`, `entity_id`, `popularity`.

Comparing a podcast with a person is not useful: the two use different tag vocabularies, so they share almost no tags and the contrast is near 100% for everyone. Worth trying podcast against podcast, or person against person.

### `GET /v2/insights?filter.type=urn:demographics`: audience makeup

Pass an entity or tag as signal. Response: `results.demographics[]`, each with `entity_id`, `query.age` (score per age bucket) and `query.gender` (`male`, `female`). Positive means the group over-indexes, negative means it under-indexes. **Verified** 21 Oct: it returns one block per input entity, so a show and several guests fit in one call.

### `GET /v2/insights?filter.type=urn:tag`: taste analysis

Returns tags tied to an entity. Combine with `signal.interests.entities`, `filter.tag.types` and `filter.parents.types`. Response: `results.tags[]` with `tag_id`, `name`, `types`, `subtype`, `tag_value`. **Verified** 21 Oct: tags carry `query.affinity`, `filter.tag.types` narrows to one type, and `diversify.by=subtype` spreads the types. A person's tags include religion and ethnicity subtypes, so allow-list subtypes.

### `GET /v2/tags`: find tag IDs by keyword

Tags must be IDs from here, never free text. There is no static tag list. **Verified** 21 Oct: `filter.query` searches by keyword, `filter.tag.types` narrows by type, and `/v2/tags/types` lists the types.

### `GET /entities?entity_ids=...`: look up entities by ID

Also accepts external IDs such as `external.spotify.ids`, `external.imdb.ids`, `external.wikidata.ids`. **Verified** 21 Oct: several IDs per call, and lookup by Wikidata and IMDb ID. A returned entity's external IDs are in `properties.external`.

## Findings from real calls

Results themselves are not written down here, because Qloo response data must not go into this repo.

- **20 Oct, a top celebrity-interview podcast → people (take 8):**
  - The picks were plausible for the show but every one was very famous (popularity above 0.85), which confirms the famous-names risk in `echo.md`. Try `filter.popularity.max`.
  - The top pick had died. Insights returns people who have died, so Echo must drop them. `properties` may carry a date of death; check.
  - Affinity scores were bunched tightly near the top of the 0 to 1 range, so raw affinity alone won't separate candidates much.
  - With a single input entity, explainability gives every result a score of 1, so it says nothing. Reasons for a match have to come from shared tags or compare.

- **20 Oct, coverage probe (`npm run probe`)** on 6 shows: 2 comedy, 2 music, 2 sports. Per show: top 10 people, plus top 10 with `filter.popularity.max=0.7`. Full report stays local in `.cache/probe/`.
  - **Coverage is good.** All 6 shows were found, and every show returned around 20 relevant people. Results follow the audience, not the topic: a music interview show's audience pointed mostly to public radio journalists rather than musicians.
  - **The popularity cap works on people** and brings back lesser-known names at slightly lower affinity.
  - **People who have died** carry `properties.date_of_death`. 0 to 4 per show were dropped.
  - **Some people can't be an input.** 0 or 1 per show returned 400 "All of the provided signal.interests.entities were invalid". Skip them.
  - **Hosts come back as guests for their own show.** Echo must exclude them.
  - **Fit (affinity) is tightly bunched** within a show (spreads of 0.03 to 0.13). Use rank or percentile, not the raw value.
  - **Love back** comes free when the show appears in the guest's top 50 podcasts (read its affinity there), with `filter.results.entities` as the fallback. Where the show ranks in the guest's list is the sharpest signal.
  - **The fit against reach trade-off is real** for the two comedy shows (correlation around -0.4 and -0.6): guests who fit best bring the fewest new listeners. More famous guests also had lower reach there.
  - **Reach v1 (overlap of top 50 podcast lists) saturates.** For several shows most guests share almost nothing with the show's top 50, so reach sits near 1 and stops separating anyone. One show had no spread at all (0.94 to 1.00). Needs a v2.
  - **Echo's ranking changes the answer.** Of Echo's top 5 per show, 1 to 3 would not appear in a fit-only top 5. Only 0 to 2 of about 20 candidates per show landed in the sweet spot (above the median on all three).
  - **Person tags include Wikipedia categories** about religion, sexuality and similar. Never use these for themes or reasons.
  - `query.measurements.audience_growth` was 0, consistent with flat trend data.

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
| 400 "All of the provided signal.interests.entities were invalid" | The entity has too little data to be used as an input. **Verified** for some people. |
| 429 `{"error_msg":"Rate limit exceeded"}` | Over the per-second limit (5 on 20 Oct, 10 since 21 Oct). **Verified.** |
| 400 "The value urn:entity:video_game is not supported for filter.type" | Use `urn:entity:videogame`. **Verified.** |
| 400 "signal.interests.entities.weight must be a positive number or one of very_low, low, mid, medium, high, very_high" | The weight is one value for all entities, not a list. **Verified.** |

## Limits and rules

- **10 requests per second and 50,000 per month** per key (**verified** from the `x-second-ratelimit-*` and `x-month-ratelimit-*` response headers, 21 Oct). On 20 Oct it was 5 and 10,000. The counter restarted around 21 Oct and resets around 20 November, so this budget covers the build and judging. Judges using the live demo draw on it too. To raise it further, post project details in Discord `#api-help`.
- The client in `src/lib/qloo/client.ts` spaces requests to 4 per second (it could go to 8 now), waits out 429s, caches every response and tracks the remaining monthly quota.
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
3. ~~Are the top people distinctive or just the most famous?~~ Famous by default; the popularity cap fixes it.
4. ~~Does love back work?~~ Yes.
5. ~~What does compare return for a show and a guest?~~ Tag contrast, not useful between a podcast and a person.
6. ~~Do `urn:demographics` and `urn:tag` return useful data for a podcast and a person?~~ Yes. Demographics handles many entities in one call. Tags need an allow-list.
7. ~~How do we detect people who have died?~~ `properties.date_of_death`.
8. Reach v2: something that doesn't saturate. Candidates: how differently the show and guest audiences skew by age and gender (`urn:demographics`); the show audience's affinity for the guest's top podcasts (`filter.results.entities` with up to 50 IDs, one call); overlap across artists or TV as well as podcasts. The teammate's spike found that audience-map overlap across categories spreads well. Demographics now costs one call for all guests ([qloo-map.md](qloo-map.md)).
9. How to spot a show's own hosts in its candidate list.
