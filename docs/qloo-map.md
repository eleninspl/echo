# Qloo API map

Every feature in Qloo's API reference, whether it works on the hackathon server, and what Echo could do with it. Endpoint details, response shapes and earlier findings are in [qloo.md](qloo.md).

Checked on 21 Oct with `npm run map-api`, about 55 calls. The input was one celebrity-interview podcast and its top guests. The full report stays local in `.cache/map/`. No Qloo results are written here.

- **Works:** verified with a real call to the hackathon server.
- **No effect:** accepted with a 200, but the results don't change. Qloo ignores invalid params silently, so every param below was compared against a baseline.
- **Fails:** returns an error.
- "Changed N of 50" means N of the show's top 50 people were replaced when the param was added.

## Limits (verified 21 Oct)

- **10 requests per second, 50,000 per month**, read from the `x-second-ratelimit-*` and `x-month-ratelimit-*` headers. On 20 Oct it was 5 and 10,000. The counter restarted around 21 Oct and resets around 20 November, so this budget covers build and judging.
- `take` is at most 50. `offset` and `page` give the next 50.

## Lookup

| Feature | Call | Status | For Echo |
| --- | --- | --- | --- |
| Search by name | `/search?query=&types=` | Works for podcasts and people | Find the show. Find a past guest the host names. |
| Sort search by popularity | `/search?sort_by=popularity` | Works | Pick the right show when names clash. |
| Entities by ID | `/entities?entity_ids=` (several per call) | Works | Match cards: image, short description. External IDs are in `properties.external`, not `external`. |
| Entities by external ID | `/entities?external.wikidata.ids=`, `external.imdb.ids=` | Works | Accept a link the host pastes. Link cards to IMDb, Spotify or Wikidata. |
| Tag search | `/v2/tags?filter.query=` | Works, mixes place, media and occupation tags | Turn an episode topic into tag IDs. |
| Tag search by type | `/v2/tags?filter.tag.types=` | Works | Occupation tags, such as comedian or author. |
| Tag types | `/v2/tags/types` | Works, 20 per page | Build the allow-list of tag types. |
| Audiences | `/v2/audiences?filter.parents.types=` | Works, though marked deprecated | Interest groups a host can grow toward. |
| Audience types | `/v2/audiences/types` | Works, 10 types | See "Keep out" below. |

## What an audience likes (`/v2/insights`, `filter.type`)

| `filter.type` | Status | For Echo |
| --- | --- | --- |
| `urn:entity:person` | Works | Candidates and fit. |
| `urn:entity:podcast` | Works | Love back. Podcasts the guest's fans bring. |
| `artist`, `book`, `movie`, `tv_show`, `brand` | Works (teammate's spike, 20 Oct) | Audience map and reach. |
| `destination`, `place` | Works | Extra colour for the audience map and briefing. |
| `urn:entity:videogame` | Works | Audience map. |
| `urn:entity:video_game` | **Fails**: 400 "not supported for filter.type" | The hackathon guide spells it this way. Use `videogame`. |
| `urn:entity:locality` | Fails with a podcast as input | Only takes localities as input. Not for Echo. |
| `urn:demographics` | Works. **One block per input entity**, so a show and several guests fit in one call. | Who the new listeners are. A reach v2 candidate: how differently two audiences skew by age and gender. |
| `urn:tag` | Works. Tags carry `query.affinity`. `filter.tag.types` narrows to one type. `diversify.by=subtype` spreads the types. | Episode themes, after filtering (see below). |
| `urn:heatmap` | Works with `filter.location.query`. About 2,000 points for one city. | Where the audience is strongest in a city. Optional, such as for a live show. |

## Signals (what goes in)

| Param | Status | Effect seen | For Echo |
| --- | --- | --- | --- |
| `signal.interests.entities`, several IDs | Works | Show plus two guests changed 15 of 50 and the whole top 10 | Show plus its best past guests as the input. |
| `signal.interests.entities.weight` | Works | **One value for all entities**, not one per entity: `very_low` to `very_high`, or a positive number. It sets the entities against demographic or tag signals. With an age signal, `very_low` replaced all 50 people and `very_high` kept about two thirds. | The dial for "grow toward" features. |
| `signal.demographics.age` | Works | Changed about 20 of 50 | "Who brings younger listeners?" |
| `signal.demographics.gender` | Works | Changed about 20 of 50 | Possible, but a product decision. Treat with care. |
| `signal.demographics.audiences` | Works only with the `urn:audience:...` value from `id`. The UUID in `entity_id` is silently ignored. | Changed about 20 of 50 | "Who brings runners, gamers, founders?" |
| `signal.demographics.audiences.weight` | Works | Stronger shift than without it | Same dial, for audiences. |
| `signal.interests.tags` | Works | Changed 15 of 50 | Guests for a planned episode topic. |
| `signal.location.query` | Works for people | Changed about 15 of 50 | Guests popular in a city. Low priority. |
| `feature.explainability` | Works | With several inputs, every input scores almost the same (mean spread about 0.02) | Secondary reason only. Reasons come from tags and compare. |

## Filters and paging

| Param | Status | Effect seen | For Echo |
| --- | --- | --- | --- |
| `filter.exclude.entities` | Works | Excluded people never came back, and 50 results still returned | Drop hosts and past guests inside the call. |
| `filter.results.entities` with many IDs | Works | 20 of 20 scored in one call | Score a whole list in one call. |
| `offset=50`, `page=2` | Works | 50 more people, no repeats | More than 50 candidates. |
| `filter.tags` with an occupation tag | Works | Replaced almost all 50 | "Only authors", "only athletes". |
| `filter.popularity.min`, `.max` | Works | All results inside the bound | Fame bands, the "less famous" option. |
| `filter.exists=properties.image` | Works | Small change | Only guests with a photo. |
| `bias.trends` | Works | Reorders the top 10, adds few | Not needed. Trend data is stale (below). |

## Analysis and trends

| Feature | Status | For Echo |
| --- | --- | --- |
| `/v2/analysis/compare`, podcast vs podcast | Works, many shared tags | Compare the show with a guest's own podcast. |
| Compare, person vs person | Works, many shared tags | "Like your best past guest, because...". |
| Compare, podcast vs person | Works, very few shared tags | Weak. The two use different tag vocabularies. |
| Compare `model`, `filter.subtype`, `filter.type` | **No effect** for podcast vs person | Results identical to the default. |
| `/v2/insights/compare` | Works (teammate, 20 Oct) | Same as analysis compare. |
| `/v2/trending` | Podcasts only, and only up to September 2025. Empty for people, and empty for 2026. | Not usable for "rising guests". |

## Keep out

- **Tags:** a person's `urn:tag` results included `urn:tag:religion:qloo` and `urn:tag:ethnicity:qloo`. Compare can include a gender tag. Use an allow-list of subtypes for themes (such as `keyword:media`, `genre:media`, `genre:music`, `theme`, `plot`, `style`), never a block-list.
- **Person properties:** `/entities` returns `gender`, `date_of_birth`, `citizenship`, `spouse` and `child`. Echo shows the image, short description and external links only.
- **Audience types:** never use `political_preferences`, `lifestyle_preferences_beliefs`, `communities`, `global_issues`, `investing_interests` or `spending_habits`. `hobbies_and_interests`, `leisure` and `professional_area` are safe. `life_stage` needs a look first.
- Demographic results describe groups. Never present them as a fact about one listener or one guest.

## Not checked, and why

- `filter.gender`, `filter.date_of_birth`, `filter.date_of_death`: Echo doesn't pick guests by gender or age. People who have died are filtered with `properties.date_of_death`.
- Place-only and heatmap options: price, hotel class, Resy, Tripadvisor, opening hours, `filter.references_brand`, `bias.quality`, `sort_by=quality` or `distance`, heatmap boundaries and dimensions. Release and publication-year filters. None are relevant.
- POST-only params (`signal.interests.entities.query`, `filter.exclude.entities.query`): POST fails on the hackathon server.
- Tuning options: `bias.content_based`, `backfill.*`, `operator.*`, `signal.interests.tags.weight`. Check them if needed.
- `/recommendations`, `/recs` and `/v2/insights/search` are legacy and unsupported. `urn:entity:audience` and the actor, author and director types are deprecated.

## What this opens up for Echo

1. **New listeners in one call.** Demographics for the show and all its candidates at once: who each guest brings, and a reach score that measures how differently the audiences skew.
2. **Grow toward a target.** The host picks younger listeners or an interest group, and the entity weight sets how far to move from the current audience.
3. **Topic-led search.** The host names an episode topic, `/v2/tags` finds the tag, and `signal.interests.tags` finds guests for it.
4. **Better candidates.** Past guests as extra input, hosts and past guests excluded in the same call, and paging past 50.
5. **Cheaper scoring.** `filter.results.entities` scores a list in one call.
6. **Richer cards.** Images, descriptions and IMDb, Spotify or Wikidata links from `/entities`.
7. **Reasons by example.** Compare a candidate with the show's best past guest.
