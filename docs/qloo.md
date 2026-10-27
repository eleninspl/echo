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
- `date_of_death` is missing for some people who have died (a philosopher who died in 2024 had only a birth date). Person results carry no Wikidata ID, but many have an IMDb, MusicBrainz or Library of Congress ID.
- English descriptions often end in a birth year or a lifespan: "(born 1970)", "(b. 1963)", "(1951–2024)", "born 1991".
- One record can mix two people with the same name: a comedian whose fans' brands were all car makers and whose music was metal, from a car writer with his name.
- Thin data: shows below popularity 0.6 mostly have no demographics block, and people with null popularity can't be scored.
- Explainability gives near-equal scores to every input, and compare between a podcast and a person shares few tags. Neither is used for reasons.
- Trending stops in September 2025 and is empty for people. Not used.

## The calls behind each v1 step

"Plain C1" below means `GET /v2/insights?filter.type=urn:entity:person&signal.interests.entities=<show>&take=50`.

| Step | Call | Calls |
| --- | --- | --- |
| Find the show | `/search?query=<text>&types=urn:entity:podcast&take=5`. Uses `entity_id`, `name`, `popularity`, `properties.image`, `properties.short_description`. Qloo always answers with 5, so a result is kept only when a word of the query (not "the", "show", "podcast" and the like) is in its title or description, give or take a typo; a made-up name gets none. | 1 |
| Usable? | The plain C1 has at least 10 living people, and love back (below) gives the show an affinity for at least one of its top 3 living people. Otherwise `show_unusable`. | 1 extra, reused |
| Audience map | `/v2/insights?filter.type=urn:entity:<t>&signal.interests.entities=<show>&take=20` for `t` in `artist, tv_show, movie, book, brand, podcast`. Screened, top 8 shown; all 20 kept for the guest comparison. A category the screen takes more than half of is left out whole: what's left of it shares the same theme. | 6 |
| Candidates | The plain C1, and C2: the same with `filter.popularity.max=0.7`. Take from the two alternately by affinity, skipping duplicates, until 20. C1 and C2 affinities compare directly. | 2 |
| Love back | Per guest: `filter.type=urn:entity:podcast&signal.interests.entities=<guest>&take=50`. If the show is in it, its `query.affinity` is love back and its position is the rank. If not, a lens: the same with `filter.results.entities=<show>`. The show is outside the top 50 for about 72% of guests. | about 34 |
| Reach | The union of every guest's top podcasts from the love back call (without the show), in chunks of 50: the top 10, or more (up to all 50) while the union needs no more chunks than the top 10's. On a one-world show the guests' fans share their top podcasts and differ only further down, so this costs no extra call. Lens: `filter.type=urn:entity:podcast&signal.interests.entities=<show>&filter.results.entities=<chunk>&take=50` | 1 to 3 |
| New listeners | `filter.type=urn:demographics&signal.interests.entities=<show>,<all guest IDs>`. One block per entity. `query.age` per bucket, -1 to 1. Drop `query.gender`. | 1 |
| Shared tastes | `filter.type=urn:tag&signal.interests.entities=<show or guest>&filter.tag.types=<allow-list>&take=50`, once per top 10 guest and twice for the show: with the allow-list, and with `urn:tag:theme:qloo` alone | 12 |
| Guest details | The audience map call with the guest as signal, `take=20`. The show itself is left out of the guest's map. "Adds" is what's in the guest's lists and not in the show's 20. | 6, on click |
| Map lens (on trial) | The audience map call with `signal.demographics.age=<bucket>`, `signal.location.query=<country>` or both. Checked 27 Oct on one comedy show: listeners 55 and older kept none of the top 8 films and 3 of the top 8 artists; Canada kept 4 of 8 artists and none of 8 films. A place that resolves but has no people (Atlantis) gives empty lists. | 6, on pick, cached |
| Guest bridge (on trial) | The guest details calls. Both: names in the show's 20 and the guest's 20, plus the named podcasts in the guest's shared tastes, ordered by the sum of ranks. Only yours: the show's not in the guest's 20. Theirs: the adds. | 0 more |
| Taste fans (on trial) | `filter.type=urn:entity:person&signal.interests.entities=<taste>&filter.results.entities=<the 20 guests>&take=50`: how much fans of one taste lean to each guest. Checked 27 Oct: every guest scored for a film and an artist; a book came back with no affinity for any guest, so books show no fans. Map items carry their entity ID for this; for an analysis made before that, the ID comes from the cached map lists. | 1, on pick |
| Hosts and past guests | Not Qloo: Apple `itunes.apple.com/lookup?id=<itunes id>&entity=podcast` for the author line and the show's RSS feed (`feedUrl`), and `&entity=podcastEpisode&limit=200` for recent episode titles. The feed's item titles go further back (380 to 1,500 episodes on long-running shows, all of them on most). The iTunes ID is `properties.external.itunes.id` on the show. Cached 7 days. | 0 |

Measured on 7 real shows: 43 to 67 calls and 8 to 16 s fresh, under 1 s cached. Q17 added one call (the show's themes).

### Filters

| Filter | What changes | Extra calls |
| --- | --- | --- |
| `fame: less_famous` or `rising` | `filter.popularity.max=0.6` or `0.4` on C1, and no C2. 0.6, not C2's 0.7, so the run differs from the default: at 0.7 a tech show's "less famous" list still had household-name founders | -1 |
| `age` | `signal.demographics.age=<bucket>` on C1 and C2. Changes about 20 of 50. | +1 (fit lens) |
| `country` | `signal.location.query=<English country name>` on C1 and C2. Country names resolve; a region like "Europe" hasn't been tried. | +1 (fit lens) |
| `episode_about` | `/search?query=<q>&types=urn:entity:<type>&take=1`, then C3: C1 with `signal.interests.entities=<show>,<entity>`. Take from C3 first, up to half of the 20. If C3 comes back identical to C1 in order, Qloo ignored the entity: report `used: null` and carry on. An anchor lens (`signal.interests.entities=<entity>&filter.results.entities=<the 20>`) adds a fourth factor to the Echo score with weight 0.35. Books are often unusable, so they aren't offered. `used` is the matched name, with its `release_year` for a film, TV show or game ("Example Show (2014)"), and the LLM gets it with its kind ("the TV show Example Show (2014)"): with the bare name, a TV show named after a place gave ten ideas about the place (27 Oct user test, E3). | +4 (search, C3, fit lens, anchor lens) |

**Fit lens.** With any signal beyond the show, list affinities no longer mean "the show's audience likes them", so fit is re-read: `filter.type=urn:entity:person&signal.interests.entities=<show>&filter.results.entities=<the 20 IDs>&take=50`.

### Clean-up, before scoring

1. Died: `properties.date_of_death` is set, or the English description has a lifespan that starts in the birth year. Then Wikidata (`wikidata.py`, for the top 40 of the pool, cached a week): a date of death (P570) on the item with the candidate's IMDb, MusicBrainz, Library of Congress, Goodreads or Spotify ID, or on an item with the same English name and birth year, and the item's birth date must agree with Qloo's (an ID in Qloo can point to someone else with the same name: a living CEO's Library of Congress ID led to a namesake who died in 2014). One small query per ID type and one by name, in parallel, 5 s each: Wikidata's query service is fast but erratic (the same query took 0.3 s and then over 30 s), so a slow query only loses its own matches. It runs beside the LLM host check and the first love back calls; if Wikidata fails, the run goes on without it. Over 1,161 cached people Qloo lists as alive, it found 9 who have died (2023 to 2026).
2. Minors: `properties.date_of_birth` less than 18 years ago. Read for this check only, never shown or kept.
3. Not a public figure: no `urn:tag:occupation:person` tag and no `imdb_id`, `wikidata`, `musicbrainz_artist_id`, `spotify_artist_id`, `library_of_congress_authority_id` or `goodreads_author_id`. Social handles don't count.
4. Hosts: a candidate's full name in the title or Apple's author line, or the names after "with" in the title ("with Ann & Bo Surname" means Ann Surname and Bo Surname; a list of single names, like "with Ann, Bo & Cy", matches first or last names). Or a candidate's full name in Qloo's description of the show (`short_description`), which often names the hosts when the author line is a network and the title names nobody; it names hosts, not guests. Plus the LLM host check (L1) when it's built, for the rest.
5. Past guests: a candidate whose full name appears in one of the last 200 episode titles on Apple, or in an older title from the RSS feed where a guest's name goes: a part of the title on its own (split at `:`, `|`, brackets, dashes), "Dr." aside, or followed by "on", "of" or "returns", or after "with" or "featuring". News shows name people in old titles who weren't guests ("BREAKING: <name> steps down"), hence the stricter rule there. Titles that start with "Introducing", "Trailer", "Preview", "Sneak peek" or "Coming soon" (any case) are skipped: trailers and cross-promotions name people who weren't guests. A guest from before the feed starts is still missed (a tech show's feed starts in 2019).
6. Duplicates: the same normalised name, keep the higher affinity.
7. Politicians and convicts: an English description that names a political role ("politician", "political commentator", "U.S. Representative", "Secretary of", "governor", "ambassador to"...) or a conviction ("felon", "convicted"); without a description, a Politician, Statesperson, Diplomat, Governor, Political Pundit, Political Activist or Convict occupation tag. The tags alone aren't used when there is a description: they mark investors and actors as politicians. Comedians and hosts who talk about politics stay.
8. Can't be an input: the love back call returns the "invalid" 400. Drop, take the next candidate (at most 5 refills).
9. Left out by the host (`filters.exclude`, 27 Oct user test, C1): entity IDs the host dropped as "had them on" or "not for us", kept in their browser per show and sent with every rerun. Dropped before the pool, so the 20 refill. A past guest the RSS check misses (a founder from before the feed starts) goes this way.

### Evidence for the top 10

- **Shared tastes** (26 Oct, #39): first up to two named podcasts both audiences love: in the guest's top podcasts used for reach, with the show's affinity in the top half, and on no more than a third of the top 10 guests' lists, fewest first. When fewer than two pass, the guest's own strongest loved podcasts (in their top 10) fill in, those not already on a higher guest's card first (27 Oct: on a tech show every guest's fans love the same podcasts, so the cards had only weak tags). Then tags in both the show's and the guest's tag lists, ordered by the sum of their ranks times the number of top 10 guests with the tag, so a rare tag beats a broad one. Tags more than half of the top 10 have are dropped, counted by name (a keyword and a theme can share one); a guest left with none keeps its two strongest common tags. A tag whose words are all in an earlier one, or the other way round, is a repeat ("satire" after "satire comedy"), and an all-lowercase tag gets capitals. A person's list is often all themes while a show's has few (on the investor judge's show, 8 of the top 10 guests had only themes and the show 2), so the show's tags are its allow-list call plus its themes call, each tag at its better rank. Allow-list: `urn:tag:keyword:media, urn:tag:genre:media, urn:tag:genre:music, urn:tag:theme:qloo`. The style and plot types are left out: their tags are vague moods that say nothing on a card. Then a word screen (`engine/echo_engine/screen.py`, generic words written by hand) drops tags about religion and the occult, sexuality, gender (including "boy" and "teenage girl"), ethnicity, health, disability, addiction, drug use, politics (including totalitarianism), money trouble, hardship (suffering, grief, struggle, alienation, violence) and society (inequality, poverty, homelessness, social justice, patriotism, nationalism, femininity), tags that read as stereotypes next to a guest ("Street Life", "Hustling", gangs), placeholder tags like "Not Applicable", and tags that say nothing on a card ("love", "secret", "Audiobook", "Contemporary", "Good Times"), because the allowed types still contain them. The society words are screened in tags only: in names they are also films and bands. On a basketball show the top guests shared "Social Inequality", "Poverty" and "Street Life" before these screens.
- **Podcasts both audiences love** (`evidence.shared_podcasts`, 27 Oct): the named podcasts that start the shared tastes, kept apart so a draft can call them "shows like ours".
- **New podcasts:** from the guest's top podcasts used for reach, those the fewest other guests have, then the lowest show affinity from the reach call, leaving out the ones shown as shared; top 3, screened.
- **Screening shown items** (map items and new podcasts): on the name (including words about race, so a book title about it is dropped, while "Black" alone is kept for titles like a well-known TV series, and about a people or a conflict: antisemitism, Jewish, Israel, Palestine, Zionism), and on the item's genre and subgenre tags only. Keyword tags on films and TV describe plot points, not the audience, and screening them dropped 18 of 20 films. Political podcasts are often tagged only "News", so a podcast whose genres are only News is dropped too.
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
| `sweet_spot` | fit ≥ 0.5, love ≥ 0.33, reach ≥ 0.33 | Your listeners tend to love them; their fans are new to you and likely to enjoy the show. |
| `far`, shown as One-way | fit ≥ 0.5, reach ≥ 0.33, love < 0.33: the box without love back | Your listeners like them and their fans are new to you, but those fans are less likely to enjoy the show. |
| `long_shot` | fit < 0.33 | Their fans might come, but your listeners aren't into them. |
| `safe` | reach < 0.33 | Your audience is likely to enjoy it; few new listeners. |
| `balanced` | otherwise | Decent on each, not top on any. |

Every label but `sweet_spot` and `far` is a region of the chart; those two split the box by love back. Until the 27 Oct user test (C3), `far` was reach ≥ 0.67 and love < 0.33, which no region showed: a guest deep in the box read "Far", and one with low love back beside it "Balanced". The API keeps the value `far`; the web app and the skill call it One-way. With null reach: `sweet_spot` if fit ≥ 0.5 and love ≥ 0.5, `long_shot` if fit < 0.33, else `balanced`. Expect 1 to 4 sweet spots in 20, sometimes 0; the page then says "No sweet spot yet, these come closest".

**Chart:** x is `reach_pct` ("How new their audience is"), y is `fit_adj_pct` ("Fit beyond fame"), dot size is `love_pct`, colour is the label. The box is high fit and reach (x ≥ 0.33 and y ≥ 0.5); its ringed dots are the sweet spots (love back ≥ 0.33), the rest one-way.

## Keep out

- Person fields: `/entities` and insights return gender, birth date, citizenship, spouse and children. Echo shows name, short description (birth years and lifespans cut out), image, links and a bio, and nothing else. The one-line description goes through the same screen as the bio's facts; when it names who the person is (identity, beliefs, health), the guest is shown without it (Eleni, 26 Oct). The bio is built in code (`pipeline.bio_of`) only from public work facts, each name screened like a tag (`screen.clean_fact`: also sexuality, ethnicity and advocacy groups like GLAAD and NAACP, since an award from one says something about the person): `notable_work`, `award_received` or else `nominated_for`, `employer` or else `member_of_sports_team`, `work_period_start` (`YYYY-MM-DD`), `instrument`. It never uses `position_held`, partners, family or `lifestyle`. `official_website` (a list of URLs) becomes the Website link. Verified from the cache, 26 Oct: about two in three people get a bio and two in five a website. `employer` is partial and in no useful order: in the cache on 27 Oct, 312 of 553 people with the property had a single employer, usually the right one (a journalist's paper), but for two founders on the investor judge's show it was an early job and not the firm they're known for, which isn't listed. Founded companies have no property, and the `wikipedia_category` tags that name them sit beside ethnicity and religion, so they aren't used. A single employer is left out of the bio of someone described as a businessperson, entrepreneur, investor, executive or founder (27 Oct): the firms they founded aren't listed, so it's usually an early job. Qloo has no contact data.
- Work from Wikidata (27 Oct user test, E1): Qloo described the top two guests on the investor judge's show only as "American businessman", so every idea, draft and briefing was blind to what they're known for. For the top 10, during the evidence step, `wikidata.work_of` asks what each person founded (P112 on the organisation), ran as chief executive (P169 on it) and is known for (P800), and their English Wikipedia page, matched like the death check (by ID or name and birth year, birth date agreeing) in one query per ID type and one by name, 5 s each, cached a week. A name must be on at least 2 Wikipedias, and the best known come first. The bio then leads with "A founder of …" and "Has been chief executive of …", adds the works to Qloo's `notable_work`, and skips employers; the page becomes the first link. Tried on the investor judge's show (27 Oct): 0.4 s a query, and 6 of the top 10 got founded companies (payments, venture, browser and ride-hailing firms) and a Wikipedia link. The prompts build on what someone founded, led or is known for, never on an employer.
- Never filter or pick guests by gender. Never use the political, beliefs, communities, global issues, investing or spending audience types.
- Copy says what a group likes more than most people do ("your listeners tend to love", "more than most"), never "over-index" (jargon, dropped in the 25 Oct UI review), and never says anything about one listener or one guest's fans as people.

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
  - Candidate lists include politicians. Dropped since 25 Oct (clean-up, 7).
- **23 Oct, Q17, evidence per guest** (the investor judge's show, checked against two comedy shows), 26 fresh calls:
  - Cause of the repeated reach and new podcasts: the top 20 guests' top 10 podcasts were 18 podcasts in all, 5 of them in every list; 15 of the 45 pairs among the top 10 had the same top 20. On the comedy shows the top 10s overlap about 0.1. The lists differ from about position 20 to 50, all of which the love back call already returns.
  - Cause of the single shared taste: the guests' tag lists were all themes and the show's mostly music and media genres; the show's own list of themes overlaps each guest's in 15 to 24 tags.
  - After the fix, on the investor judge's show: 17 reach values in 20 (8 before), 9 different sets of new podcasts in the top 10 (5), and 10 different sets of 5 shared tastes (3, mostly 1 tag). The comedy shows were already distinct and stay so. One call more per analysis.
- **25 to 26 Oct, QA runs on 9 shows** (comedy, sports, true crime, health, music, culture, business, science, a talk show), with the LLM, through `engine/scripts/qa.py`:
  - People who have died without `date_of_death`: 9 of 1,161 cached people, among them a philosopher and a football player who died in 2024. Wikidata catches them (clean-up, 1).
  - Descriptions: about 1 in 10 English person descriptions carries a birth year or lifespan; 31 of 954 people have none, most of them with occupation tags; 4 are only "researcher", from a scholar with the same name.
  - Same-name mix-ups in a record: on 3 of 9 shows a top-10 guest's description or fans belonged partly to someone else (a car writer's fans on a comedian, a botanist's description on an investor, "noblewoman" on a songwriter). Echo can't fix the record; the prompts leave out what doesn't fit the description.
  - Tags: on the sports show, the basketball players' shared tastes were "Social Inequality", "Poverty", "Street Life" and "Hustling"; elsewhere "boy", "teenage girl", "love", "Totalitarianism" and "Audiobook". All screened now.
  - The true crime show's top guests are reality TV contestants: its audience really does love them, but it is a weak demo show.
  - Politicians and political commentators came back on the talk and business shows, and a political book and a pandemic book in one show's own audience map. Both screened now.
- **23 Oct, Q16, end to end on the deployed engine** (`https://echo-qloo.vercel.app`, empty production cache): the 7 test shows and the investor judge's second show, default filters, one at a time, about 416 fresh calls in all.
  - Every run finished. `POST /analyses` answered 202 in 0.3 to 0.5 s, and the runs were done in 4.8 to 9.9 s with 44 to 67 calls (32 to 64 fresh), faster than locally. A poll takes about 0.3 s. Guest details took 3.6 s fresh and 0.4 s cached.
  - 1 to 4 sweet spots per show, as before.
  - Hosts: caught on every show, 3 of 4 on the judge's second show; the fourth isn't among its candidates.
  - Past guests: 32 of 34 matches were real guests. The other two: a name mentioned in a news episode's title, and a trailer for another show ("INTRODUCING: … with <name>"). Both are left out wrongly. Trailer titles are skipped since (rule 5); the news mention needs the LLM check (L7).
- **24 Oct, a host missed on a sports talk show** (found on production by the web session; no Qloo calls to check): Apple's author line was the network and the title named nobody, so neither rule caught a host. Qloo's description of the show named both hosts. On 16 shows (the Q16 eight and the shortlist), the description named only hosts: four already caught by the other rules and this one. Rule 4 now uses it, with full names only.
- **26 Oct, featured shows and shared tastes** (#39), about 880 fresh calls locally and 85 on production: 16 candidate shows. Comedy, sports and business shows give 3 to 5 sweet spots easily. Music shows' candidates are mostly journalists, radio interviewers and comedians, with 2 to 4 sweet spots; one hip-hop show was unusable. On a comedy interview show from the cache, 8 of the top 10 guests now start their shared tastes with one or two named podcasts, all different, and the tag every guest had is gone.
- **27 Oct, end to end test fixes**, on 4 shows, mostly from the cache (about 150 fresh calls): the RSS feed found 2 to 11 more past guests on long-running shows (every one checked against the feed was a real guest), among them the top sweet spot on a featured business show and on a health show. Asking the LLM which candidates had been guests was tried and dropped: on a show whose feed holds every episode, 5 of the 6 people it named never appeared. One health show's whole book list was about one people and a conflict, half of it untagged, so the name screen now covers those words and drops such a category whole. A same-name mix-up described an investor as a botanist; the ideas call now says when a description belongs to someone else, and that guest is shown without it.
- **27 Oct, user test fixes** (a startup show, every run from the cache: 6 fresh Qloo calls in all, for guest panels): with the theme from the test, the top 10's bios name what they founded (payments, venture, browser, ride-hailing and workplace software firms) and link to Wikipedia; the ten ideas are ten different angles instead of the theme reworded. With a brand as the subject plus the theme, all 10 ideas mention the brand (none did before); with a TV show as the subject, the ideas are about the show, not the place it's named after. Under the new label rule two guests in the box read One-way, where one was "Far" and one "Balanced" before.
