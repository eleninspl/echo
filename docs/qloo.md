# Qloo for Echo

How to call Qloo, the exact calls behind each v1 step, and the scoring. Everything here was checked on the hackathon server between 20 and 22 Oct (about 900 calls). The check-by-check record (C1 to C90) and the recipes we cut from v1 are in `docs/features.md` at commit 3419283.

Sources: the [hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide) and the reference pages it links to.

## Basics

- Host `https://hackathon.api.qloo.com` only. Hackathon keys get 401 on `api.qloo.com` and `staging.api.qloo.com`.
- Auth is the `X-Api-Key` header. Every call is GET with query-string params. POST fails with "No path matching request parameters".
- **10 requests a second, 50,000 a month**, covering build and judging. Resets around 20 Nov. Read from the `x-second-ratelimit-*` and `x-month-ratelimit-*` headers.
- Go through `QlooClient` in `engine/`: throttled to 9 a second (shared by every instance through Redis on Vercel), cached in `.cache/` or Postgres, checks params per `filter.type`. Private caching is allowed with no time limit. Qloo data never goes in the repo.
- `take` is at most 50; `offset=50` gives the next 50. On a lens, send `take=50` or only 20 come back.

## Gotchas

- **Invalid params are ignored silently**: 200 with empty or unchanged results. An empty result usually means a param that isn't valid for that `filter.type`.
- **A lens hides bad signals.** `filter.results.entities` answers 200 with every requested entity even when Qloo can't use the signal, with no `query.affinity`. Check for the affinity, not the status. Unscored is never 0.
- **Some shows are never returned as a result.** They work as a signal, but love back can't be scored for them. Mostly shows below popularity 0.6.
- **Some people can't be an input**: 400 "All of the provided signal.interests.entities were invalid". It is per `filter.type`: the same person can fail on podcast lists and work on person lists.
- Video games are `urn:entity:videogame`. The guide's `video_game` returns 400.
- Entity weight `high` is the same as no weight. `very_high`, `medium` and `mid` are real steps. The weight is one value for all entities.
- An unknown location returns 400 "unable to resolve to a valid locality". An unknown tag ID returns 200 with results.
- Lists over about 210 IDs in one URL fail with 414. Chunk `filter.results.entities` into 50s.
- `/entities` can't look up iTunes IDs. External IDs are under `properties.external`.
- Insights returns people who have died and a show's own hosts. A person never appears in their own list, and a show never appears in its own podcast list.
- Thin data: shows below popularity 0.6 mostly have no demographics block, and people with null popularity can't be scored.
- Explainability gives near-equal scores to every input, and compare between a podcast and a person shares few tags. Neither is used for reasons.
- Trending stops in September 2025 and is empty for people. Not used.

## The calls behind each v1 step

"Plain C1" below means `GET /v2/insights?filter.type=urn:entity:person&signal.interests.entities=<show>&take=50`.

| Step | Call | Calls |
| --- | --- | --- |
| Find the show | `/search?query=<text>&types=urn:entity:podcast&take=5`. Uses `entity_id`, `name`, `popularity`, `properties.image`, `properties.short_description`. | 1 |
| Usable? | The plain C1 has at least 10 living people, and love back (below) gives the show an affinity for at least one of its top 3 living people. Otherwise `show_unusable`. | 1 extra, reused |
| Audience map | `/v2/insights?filter.type=urn:entity:<t>&signal.interests.entities=<show>&take=20` for `t` in `artist, tv_show, movie, book, brand, podcast`. Screened, top 8 shown; all 20 kept for the guest comparison. | 6 |
| Candidates | The plain C1, and C2: the same with `filter.popularity.max=0.7`. Take from the two alternately by affinity, skipping duplicates, until 20. C1 and C2 affinities compare directly. | 2 |
| Love back | Per guest: `filter.type=urn:entity:podcast&signal.interests.entities=<guest>&take=50`. If the show is in it, its `query.affinity` is love back and its position is the rank. If not, a lens: the same with `filter.results.entities=<show>`. The show is outside the top 50 for about 72% of guests. | about 34 |
| Reach | The union of every guest's top podcasts from the love back call (without the show), in chunks of 50: the top 10, or more (up to all 50) while the union needs no more chunks than the top 10's. On a one-world show the guests' fans share their top podcasts and differ only further down, so this costs no extra call. Lens: `filter.type=urn:entity:podcast&signal.interests.entities=<show>&filter.results.entities=<chunk>&take=50` | 1 to 3 |
| New listeners | `filter.type=urn:demographics&signal.interests.entities=<show>,<all guest IDs>`. One block per entity. `query.age` per bucket, -1 to 1. Drop `query.gender`. | 1 |
| Shared tastes | `filter.type=urn:tag&signal.interests.entities=<show or guest>&filter.tag.types=<allow-list>&take=50`, once per top 10 guest and twice for the show: with the allow-list, and with `urn:tag:theme:qloo` alone | 12 |
| Guest details | The audience map call with the guest as signal, `take=20`. "Adds" is what's in the guest's lists and not in the show's 20. | 6, on click |
| Hosts and past guests | Not Qloo: Apple `itunes.apple.com/lookup?id=<itunes id>&entity=podcast` for the author line, and `&entity=podcastEpisode&limit=200` for recent episode titles. The iTunes ID is `properties.external.itunes.id` on the show. Cached 7 days. | 0 |

Measured on 7 real shows: 43 to 67 calls and 8 to 16 s fresh, under 1 s cached. Q17 added one call (the show's themes).

### Filters

| Filter | What changes | Extra calls |
| --- | --- | --- |
| `fame: less_famous` or `rising` | `filter.popularity.max=0.7` or `0.4` on C1, and no C2 | -1 |
| `age` | `signal.demographics.age=<bucket>` on C1 and C2. Changes about 20 of 50. | +1 (fit lens) |
| `country` | `signal.location.query=<English country name>` on C1 and C2. Country names resolve; a region like "Europe" hasn't been tried. | +1 (fit lens) |
| `episode_about` | `/search?query=<q>&types=urn:entity:<type>&take=1`, then C3: C1 with `signal.interests.entities=<show>,<entity>`. Take from C3 first, up to half of the 20. If C3 comes back identical to C1 in order, Qloo ignored the entity: report `used: null` and carry on. An anchor lens (`signal.interests.entities=<entity>&filter.results.entities=<the 20>`) adds a fourth factor to the Echo score with weight 0.35. Books are often unusable, so they aren't offered. | +4 (search, C3, fit lens, anchor lens) |

**Fit lens.** With any signal beyond the show, list affinities no longer mean "the show's audience likes them", so fit is re-read: `filter.type=urn:entity:person&signal.interests.entities=<show>&filter.results.entities=<the 20 IDs>&take=50`.

### Clean-up, before scoring

1. Died: `properties.date_of_death` is set.
2. Minors: `properties.date_of_birth` less than 18 years ago. Read for this check only, never shown or kept.
3. Not a public figure: no `urn:tag:occupation:person` tag and no `imdb_id`, `wikidata`, `musicbrainz_artist_id`, `spotify_artist_id`, `library_of_congress_authority_id` or `goodreads_author_id`. Social handles don't count.
4. Hosts: a candidate's full name in the title or Apple's author line, or the names after "with" in the title ("with Ann & Bo Surname" means Ann Surname and Bo Surname; a list of single names, like "with Ann, Bo & Cy", matches first or last names). Plus the LLM host check (L1) when it's built, for author lines that are a company. Qloo's own description never names the hosts.
5. Past guests: a candidate whose full name appears in one of the last 200 episode titles on Apple.
6. Duplicates: the same normalised name, keep the higher affinity.
7. Can't be an input: the love back call returns the "invalid" 400. Drop, take the next candidate (at most 5 refills).

### Evidence for the top 10

- **Shared tastes:** tag IDs in both the show's and the guest's tag lists, ordered by the sum of their ranks, with tags that more than half of the top 10 guests have going last. A person's list is often all themes while a show's has few (on the investor judge's show, 8 of the top 10 guests had only themes and the show 2), so the show's tags are its allow-list call plus its themes call, each tag at its better rank. Allow-list: `urn:tag:keyword:media, urn:tag:genre:media, urn:tag:genre:music, urn:tag:theme:qloo`. The style and plot types are left out: their tags are vague moods that say nothing on a card. Then a word screen (`engine/echo_engine/screen.py`, generic words written by hand) drops tags about religion, sexuality, gender, ethnicity, health, disability, addiction, politics and money trouble, because the allowed types still contain them.
- **New podcasts:** from the guest's top podcasts used for reach, those the fewest other guests have, then the lowest show affinity from the reach call; top 3, screened.
- **Screening shown items** (map items and new podcasts): on the name, and on the item's genre and subgenre tags only. Keyword tags on films and TV describe plot points, not the audience, and screening them dropped 18 of 20 films. Political podcasts are often tagged only "News", so a podcast whose genres are only News is dropped too.
- **Ages:** `delta[b] = guest.age[b] - show.age[b]`. Show the up to 2 buckets with the largest delta above 0.2. With no show block, the guest's own buckets of at least 0.2. Many less famous guests have no block: say so.

## Scoring

Raw affinities are bunched (fit spreads of 0.03 to 0.13 in a show), so every score is a percentile within the 20 scored guests: `pct(x_i) = (number of j with x_j < x_i) / (n - 1)`, ties share the lower value.

- **Fit:** `fit_raw` = the guest's affinity from C1 or C2, or from the fit lens. **Fame-adjusted:** `fit_adj = fit_raw - (a + b · popularity)`, with `a` and `b` from least squares over the 20 (skip when n < 8). Raw fit tracks fame at 0.56 to 0.87; adjusted, the top 5 stop drifting to the most famous. The score, labels and chart use `fit_adj`.
- **Love back:** `love_raw` from the love back call.
- **Reach:** `reach_raw = 1 - mean(show affinity of the guest's top podcasts)` (10 or more, as in the reach call above), over the podcasts that came back with an affinity. Null if fewer than 5 did. It never saturates and doesn't reward fame. It correlates with love back at -0.73 to -0.97: the trade-off is real.
- **Echo score:** `echo = ((fit_adj_pct + 0.05) · (love_pct + 0.05) · (reach_pct + 0.05)) ^ (1/3) / 1.05`. A null reach uses 0.5 here. The 0.05 stops one zero wiping a guest out; the geometric mean ranks a balanced guest above a lopsided one.
- **Order:** echo, then `love_raw`, then lower popularity, then `entity_id`.

Labels, first match wins:

| Label | Rule | On the card |
| --- | --- | --- |
| `sweet_spot` | fit ≥ 0.5, love ≥ 0.33, reach ≥ 0.33 | Your audience over-indexes on them; their audience is new to you and likely to enjoy the show. |
| `far` | reach ≥ 0.67, love < 0.33 | Brings new people who may not stay. |
| `long_shot` | fit < 0.33 | Their fans might come; your audience is lukewarm. |
| `safe` | reach < 0.33 | Your audience is likely to enjoy it; few new listeners. |
| `balanced` | otherwise | Decent on each, not top on any. |

With null reach: `sweet_spot` if fit ≥ 0.5 and love ≥ 0.5, `long_shot` if fit < 0.33, else `balanced`. Expect 1 to 4 sweet spots in 20, sometimes 0; the headline then says "No guest clears all three yet. These come closest."

**Chart:** x is `reach_pct` ("How new their audience is"), y is `fit_adj_pct` ("Fit beyond fame"), dot size is `love_pct`, colour is the label. The sweet-spot zone is x ≥ 0.33 and y ≥ 0.5; only its big dots are sweet spots.

## Keep out

- Person fields: `/entities` and insights return gender, birth date, citizenship, spouse and children. Echo shows name, short description, image and links only.
- Never filter or pick guests by gender. Never use the political, beliefs, communities, global issues, investing or spending audience types.
- Copy reads "your listeners over-index on", never "your listeners like", and never says anything about one listener or one guest's fans as people.

## Errors

| Symptom | Cause |
| --- | --- |
| 401 | Wrong host, or the key isn't in `X-Api-Key` |
| "No path matching request parameters" | POST instead of GET |
| 200 with empty `entities` | A param that isn't valid for that `filter.type`, or no data |
| 400 "All of the provided signal.interests.entities were invalid" | That entity can't be an input for this `filter.type` |
| 400 "not supported for filter.type" | `video_game`; use `videogame` |
| 400 on `signal.interests.entities.weight` | A list was sent; it takes one value |
| 414 | Too many IDs in one URL |
| 429 `Rate limit exceeded` | Over 10 a second; the client waits and retries |

## Probe history

- **20 Oct, coverage probe and engine spike** (13 shows: comedy, music, sports, interviews): coverage is good for those genres; the top people are plausible guests but very famous without a fame cap; hosts and near-duplicates come back; reach v1 (overlap of top 50 podcast lists) saturates, which led to the reach above.
- **22 Oct, the investor judge's two shows:** both in Qloo with plenty of data, love back and demographics work, and their hosts come back as candidates, so host detection has to be tested on them.
- **23 Oct, pipeline runs** on 7 shows (comedy, music, sports, tech, including the investor judge's two):
  - Every run finished. 1 to 5 sweet spots in 20, depending on the show and filters.
  - Hosts: caught from Apple's author line or the title on every show. Author lines that name a network or a company need the title or the LLM check. Some hosts aren't in Qloo's lists at all.
  - Past guests: 1 to 6 per show caught from episode titles.
  - Searching one show's name returned a different show with the same name first, so the host has to pick.
  - Reach ties within one-world shows: tech guests' fans share the same top podcasts, so several guests get the same reach and the same "new podcasts". Fixed in Q17, below.
  - Shared tastes are often empty for sports and tech guests, whose tags barely overlap the show's. Fixed in Q17, below.
  - Filters: "less famous" changed 9 of 20 guests; age and country change the list; a made-up country gives `unknown_country`. "Atlantis" resolves to a real town with no people, which gives `filters_too_narrow`.
  - The film anchor changes the list, but the results are mixed (on a music show, "episode about Dune" moved a politician up). Check it before using it in the demo.
  - Candidate lists include politicians. Echo doesn't drop them.
- **23 Oct, Q17, evidence per guest** (the investor judge's show, checked against two comedy shows), 26 fresh calls:
  - Cause of the repeated reach and new podcasts: the top 20 guests' top 10 podcasts were 18 podcasts in all, 5 of them in every list; 15 of the 45 pairs among the top 10 had the same top 20. On the comedy shows the top 10s overlap about 0.1. The lists differ from about position 20 to 50, all of which the love back call already returns.
  - Cause of the single shared taste: the guests' tag lists were all themes and the show's mostly music and media genres; the show's own list of themes overlaps each guest's in 15 to 24 tags.
  - After the fix, on the investor judge's show: 17 reach values in 20 (8 before), 9 different sets of new podcasts in the top 10 (5), and 10 different sets of 5 shared tastes (3, mostly 1 tag). The comedy shows were already distinct and stay so. One call more per analysis.
