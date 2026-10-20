# Qloo for Echo

Qloo holds a taste graph of more than 250 million things people like, across music artists, film, TV, books, podcasts, games, people, places, brands and destinations. Given a few things an audience likes, it predicts what else that audience is likely to enjoy, including in other categories. It answers from patterns across large groups and holds no accounts for individuals.

## What Echo uses it for

| Echo step | Qloo feature |
| --- | --- |
| Find the show | Search, with type `urn:entity:podcast` |
| Map the audience | Insights with the show as input, across artists, books, films, TV, brands, places |
| Find candidates | Insights with the show as input, type `urn:entity:person` |
| Love back | Insights with the guest as input, checking where the show ranks |
| Reach | Compare: what two sets of tastes share and where they differ |
| Explain each match | Explainability: which input led to each result, with a strength score |
| Who the new listeners are | Audience makeup: which age groups and genders over-index |
| Episode theme | Taste profiles (tags such as genres and themes) shared by both sides |

## API notes

From Qloo's public docs. **Not yet checked against the hackathon server.**

- Base URL: `https://hackathon.api.qloo.com` (from `.env.example`)
- Auth: header `X-Api-Key`
- **Search:** `GET /search` with `query`, `types`, `take`, `page`, `sort_by` (`match`, `distance`, `popularity`), `filter.popularity`
- **Insights:** `GET /v2/insights`
  - `filter.type` (required): one of `urn:entity:artist`, `book`, `brand`, `locality`, `movie`, `person`, `place`, `podcast`, `tv_show`, `videogame`
  - `signal.interests.entities`: comma-separated entity IDs the results should be based on
  - `signal.demographics.age`, `signal.demographics.gender`
  - `filter.exclude.entities`: IDs to leave out
  - `filter.tags`, `filter.location` and other filters (a popularity filter for insights is still to confirm)
  - `take`: default 20, max 50
  - `feature.explainability=true`: adds a 0 to 1 score per input entity on each result
- **Compare** and **audiences:** mentioned in Qloo's material, exact routes still to find.

## Limits

- No dishes, individual songs or individual products.
- Coverage is uneven and favours well-known people, shows and places.
- It describes groups. Never treat a result as a statement about one person.
- Usage limits aren't published. Cache responses locally in `.cache/` (git-ignored, never committed, because the repo goes public).

## Reported by other teams, not yet checked by us

- Trend data is flat on the hackathon server and ends in September 2025.
- Heatmaps limited to an area's boundary return errors.

Echo doesn't depend on either, but worth knowing before adding a trends feature.

## First checks once the key works

1. Do well-known comedy, music and sports podcasts exist as podcast entities?
2. Do the people those shows invite exist as person entities?
3. With a show as input, are the top people distinctive or just the most famous names?
4. Does explainability return usable reasons for person results?
5. Where do compare and audience makeup live, and what do they return?
6. Does asking from the guest's side (guest as input) give a meaningful "love back" signal for the show?
