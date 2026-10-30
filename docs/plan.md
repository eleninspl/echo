# Plan (v1)

What we build by the **27 Oct freeze**, from the 22 Oct call. Only what the demo needs: anything not on this page is not in v1. The Qloo calls and the scoring are in [qloo.md](qloo.md).

## v1

Two pieces: the **engine** (Python, FastAPI) and the **web app** (Next.js), both on Vercel ([Hosting](#hosting)). The host types their show, picks it from a short list, and sees their audience map and 10 guests the audience will like, whose fans are new to the show and would like it back. Each guest has a reason, an episode title and a two-line pitch; a click opens the full episode idea and what that guest would add to the audience map. The host asks for changes in the chat, Ask Echo ("younger listeners", "less famous", "an episode about a film", a theme), and Echo runs again; since W32 the page has no filter controls of its own. The host picks one or more guests and gets an invitation draft for each, plus a briefing. Echo sends nothing.

1. **Find the show.** Qloo search, up to 5 podcasts with image and description; the host picks one. A show Qloo doesn't have, or one with too little data, gets "Echo can't analyse this show yet" and the featured shows.
2. **Audience map** across music, film, TV, books, brands and podcasts.
3. **Candidates:** the people the audience likes most, plus a fame-capped list.
4. **Clean-up:** drop people who have died (Qloo, then Wikidata), hosts, duplicates, past guests, politicians and convicts, and anyone the host left out.
5. **Score and rank:** fit (fame-adjusted), love back, reach, a label, and evidence (shared tastes, new podcasts, age groups).
6. **Ideas** for the top 10: reason, episode title, two-line pitch.
7. **Details** on click: the full episode idea, and the guest's audience map next to the show's.
8. **Chat:** the LLM turns a request into filters (fame, age group, episode about a film, artist or brand) and runs again, rewrites one idea, or leaves one guest out.
9. **Invite:** drafts for the picked guests, revisable ("shorter"), shown with a copy button.
10. **Briefing** before recording, on Your guests: every picked guest by show, where each invitation stands (not sent, sent, booked), with the invitation, the briefing, the episode plan and their fans next to yours. Kept in the browser, no accounts.
11. **Qloo stays under the hood.** The UI doesn't name Qloo (25 Oct call, which cut the What Qloo saw tab); the analysis still returns `qloo_calls`.

3 or 4 featured shows, precomputed, open instantly from the landing page.

**OpenClaw** (To agree 1): `openclaw/` is the workspace of an Echo agent for a host's own OpenClaw: `AGENTS.md`, `SOUL.md`, `IDENTITY.md` and the `echo` skill (`openclaw/skills/echo/`), a Node script with no dependencies that calls the API below (`find`, `analyze`, `results`, `guest`, `ask`, `invite`, `revise`, `brief`) and prints plain text for the agent. It keeps the ideas the chat rewrites, the last draft per guest and the guests the chat left out (per show) in a temp folder, and sends them back like the web app does; `guest` and `brief` take `--length`. It drafts in whatever chat OpenClaw is connected to, and sends a draft only when the host says to, through a tool the host has set up. Leonidas.

**Not in v1:** shows Qloo doesn't have, pasting Apple, Spotify or RSS links, a hosted OpenClaw bot, logins, sessions, SSE, sending or approving in the web app, checking a named guest, grow toward interests, cities or another show, topic tags, the plain-AI comparison (make it offline for the pitch if there's time), an after-episode summary.

## Engine tasks

One person each. **Q** talks to Qloo and does the maths: Eleni, from 23 Oct. **L** talks to the LLM: not assigned yet (point 2 under To agree). They meet in Python, in `engine/echo_engine/`:

| File | Owner | What's in it |
| --- | --- | --- |
| `models.py` | both | The API shapes below as Pydantic models. Change them together. |
| `app.py` | Q | The routes, background runs and mock mode. |
| `pipeline.py`, `scoring.py`, `cleanup.py`, `screen.py`, `apple.py`, `wikidata.py` | Q | The analysis. `run_analysis` calls L1 and L2. |
| `store.py` | Q | Analyses, caches and counters: local files, or Postgres and Redis on Vercel (Q12, Q13). |
| `llm.py` | L | `find_hosts`, `write_ideas`, `write_episode`, `chat`, `write_drafts`, `write_briefing`, `past_guest_names`. Stubs. |
| `qloo_client.py`, `params.py` | Q | The Qloo client. |
| `fixtures/example.json` | both | Invented example data for mock mode and tests. |

With `ECHO_MOCK=1` every route answers from the example, so the web app and the LLM prompts can be built before the pipeline works. Without it, a stub returns 501 `not_implemented` until it's built.

Mock mode also has invented shows that fail or stall like a real run, so the web app can show every case (`mock_failures` in the example). Search for "fails", "slow" or an error code to find them, or post their IDs:

| Show ID | What happens |
| --- | --- |
| `00000000-0000-0000-0000-0000000000f1` | The run fails at "Finding guests" with `show_unusable` |
| `00000000-0000-0000-0000-0000000000f2` | The run fails at "Removing hosts and past guests" with `filters_too_narrow` |
| `00000000-0000-0000-0000-0000000000f3` | The run fails at "Finding guests" with `unknown_country` |
| `00000000-0000-0000-0000-0000000000f4` | The run fails at "Scoring" with `daily_cap` |
| `00000000-0000-0000-0000-0000000000f5` | `POST /analyses` answers 429 `daily_cap` |
| `00000000-0000-0000-0000-0000000000f6` | The run fails at "Collecting the evidence" with `qloo_error` |
| `00000000-0000-0000-0000-0000000000f7` | The run fails at "Writing episode ideas" with `llm_error` |
| `00000000-0000-0000-0000-0000000000f8` | The run fails at "Scoring" with `engine_error` |
| `00000000-0000-0000-0000-0000000000f9` | The run stays `running` for 20 s, then finishes like the example |
| `00000000-0000-0000-0000-0000000000fa` | The run finishes like the example; guest details answer 502 `llm_error` |

Each message is the one the real engine sends. Outside mock mode the engine ignores these shows.

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
| Q9 | Routes, background runs and polling, daily cap, featured shows warmed at start (`ECHO_FEATURED`) | 0.75 | done, for one process; Q12 to Q15 move it to Vercel |
| Q10 | Drop past guests: candidates whose full name is in one of the last 200 episode titles on Apple (and older titles from the RSS feed since Q18) | 0.25 | done |
| Q11 | Fixes from the #5 review, below | 0.5 | done |
| Q12 | `store.py`: analyses, the Qloo and Apple caches behind one interface, local files or Postgres ([Hosting](#hosting)) | 0.5 | done |
| Q13 | Qloo throttle, daily cap and quota in Redis, shared by all instances | 0.25 | done |
| Q14 | Deploy: the Vercel project, Neon and Upstash, env vars, spend limit; check background runs | 0.5 | done |
| Q15 | Featured shows: `scripts/warm.py` writes them to the production store; `/featured` reads them | 0.25 | done |
| Q16 | End to end on the deployed engine: the 7 test shows and the investor judge's show, calls and time per run | 0.25 | done |
| Q17 | Evidence that differs per guest: on the investor judge's show, 9 of 20 guests share one reach value and the same two "new podcasts", and shared tastes are mostly one tag | 0.5 | done |
| Q18 | Fixes from the 27 Oct end to end test (Leonidas): analyses stamped with a pipeline version, reused only when it matches; past guests also from the show's RSS feed; a map category mostly screened out left out whole, and names about a people or a conflict screened; shared tastes filled with strong named podcasts and without near-repeats; "less famous" at 0.6; no lone employer in a businessperson's bio; what both audiences love never marked new to the show; search results that share no word with the query dropped | 0.5 | done |
| Q19 | More from the audience map (27 Oct, Leonidas, on `web/audience-map`, on trial: the team keeps what it wants): the map for listeners of one age group or one country; a guest's bridge (what both audiences love, what only the show's listeners love, what the guest's fans add, from the full lists of 20); the guests whose fans lean most to one taste; Ask Echo told which guests' fans like a taste, pointing the page's map at tastes, an age group or a country, and naming the guests its reply is about. When Echo points at an age group or a country, the engine adds one sentence naming what that group leans to most, from the lens, so the model never guesses it. Map items carry their Qloo ID | 0.5 | on trial |
| Q20 | Fixes from the 27 Oct user test (Leonidas; E1, E3, C1, C3): the top 10's bios and links from Wikidata (what they founded, ran and are known for, and their Wikipedia page); the subject's year in `episode_about.used`; `filters.exclude`, the guests the host left out, dropped before the pool; `far` (One-way) is the box without love back, so every other label is a chart region; `pipeline.VERSION` 2 | 0.5 | done |

**Q11, the #5 review** ([comments](https://github.com/eleninspl/echo-qloo/pull/5)):

- The daily cap is checked by the Qloo client before every fresh call, so it covers every route; cached calls, like a featured show's, still work.
- `usable()`: a top person with no love back affinity moves on to the next of three, instead of failing the show.
- A running analysis is registered under its request key, so the same show and filters don't start a second run. A finished one is reused only if its guests have bios and, when the LLM is set up now, ideas: older runs are made again. Since Q18 every analysis carries the pipeline's `version` (`pipeline.VERSION`), and one from another version is never reused: bump it with any change to what a run finds or shows, and run `warm.py` again for the featured shows, which `/featured` reads by ID.
- A saved analysis that doesn't validate is skipped and logged, not a crash at startup.
- `optional()` catches only `NotImplementedError`; any other LLM error fails the step with `llm_error`.
- Duplicate names keep the higher affinity, as qloo.md says.
- Past guests: checked on the investor judge's show, where every match was a real guest, so the rule stays. Rechecked on 8 shows in Q16: 32 of 34 matches were real guests, and trailer titles are now skipped (qloo.md, Probe history).
- Smaller: the usage count is written once per run, not per call; one helper instead of `nothing`, `none` and `no_author`.

Every Q task is done when its tests pass against the fake Qloo and the local store, ruff is clean, and it works once against the real server.

| # | L: LLM side | Days | |
| --- | --- | --- | --- |
| L1 | Host check: which candidates are the show's hosts or regular co-hosts | 0.25 | first version |
| L2 | Ideas for the top 10 in one call | 0.5 | first version |
| L3 | The full episode idea for one guest | 0.25 | first version |
| L4 | Chat: one structured decision with three actions (run again with filters, rewrite one idea, just answer) | 1 | first version |
| L5 | Drafts for 1 to 5 guests, and revise | 0.5 | first version |
| L6 | Briefing | 0.25 | first version |
| L7 | Past guests whose names Q10's exact match misses (could; Q10 already catches most) | 0.25 | could |

Q1 to Q17 are done and deployed; Q18 to Q20 are done and wait for a deploy. L1 to L6 have a first version (25 Oct, Leonidas): prompts in `llm.py`, one call each with a strict schema, checked end to end through the Claude wrapper on a real show. After the 25 Oct QA run the prompts ask for plain words (no "over-index" or other analytics terms) and for the strongest shared tastes, never a broad tag on its own. A second QA round (25 to 26 Oct, 9 shows: comedy, sports, true crime, health, music, culture, business, science, a talk show) tuned them further: reasons open in different ways, pitches are written for listeners (no talk of fans or other podcasts), shared tastes are never presented as facts about the guest, tastes from a same-name mix-up and tastes that say nothing (weather apps) are left out, drafts never tell a guest what their own fans listen to, briefing questions are about the guest, and a chat rewrite gets the same idea shape (it came back with four sentences). L1 now runs beside the first love back calls instead of before them. After trying the OpenClaw agent on the investor judge's show (27 Oct) they also: call a guest by name or "they", never "he" or "she", with neutral words for their work; never make a bio fact the subject of an episode (Qloo's employer list can hold only an early job, which became two founders' episode ideas); say age groups are where a guest's fans stand out, not their main ages; and in drafts, say "we" for the show, name the sender only in the sign-off and never name the hosts from the show's description (a draft signed by someone else named the host from the description as well). After the 27 Oct user test (E1 to E7), the prompts build on what a guest founded, led or is known for (Wikidata, Q19), never on an employer; an episode subject reaches them with its kind and year, and with a theme too the ideas are the subject seen through the theme; a theme is a lens, not a title, so ten ideas take ten angles; the full episode keeps the idea's title, has a segment on the guest's own work and one on the strongest named shared taste, no segments on broad tags, questions only that guest could answer, and minutes per segment when the invite page has a length; drafts say in one sentence what the guest gains (their fans tend to enjoy shows like ours, many of our listeners would be new to them); a briefing without known facts ends "Who they are" with a line to read up, never an apology; the chat can leave a guest out (`leave_out`). Since the 27 Oct end to end test, the ideas call also says, per guest, whether the description belongs to someone else with the same name (`description_fits`, a botanist's description on an investor whose fans love business podcasts); such a guest is shown without the description and bio, and the idea leaves them out. `scripts/qa.py "<show>"` runs the whole flow on one show (analysis, two episodes, a briefing, two drafts and a revision, five chat requests), times each step and flags jargon, hype, predictions, birth years, dashes, sensitive words, lengths and the wrong chat action; reports go to `.cache/qa/`. Next: compare models on OpenRouter with it. Without `OPENROUTER_API_KEY` the engine treats L as not built, so production keeps working until the key is set. `scripts/analyze.py "<show>"` runs it from the terminal. Every prompt writes only from the evidence it's given, never invents facts about a person, never mentions sensitive traits and never calls a match a prediction about one listener. Every call goes through `llm_client.py`: OpenRouter in production, a Claude subscription locally ([The LLM](#the-llm)).

## Web app tasks

**W**, in `web/`: the whole v1 flow above, built against mock mode first (`ECHO_MOCK=1`), then on the live engine. The app talks to the engine only, from the browser, through `web/src/lib/echo.ts`. Five routes: `/` (find the show, featured shows), `/analyses/[id]` (everything else, so a featured show or a rerun is just another ID), `/analyses/[id]/guests/[ref]` (the page with one guest's panel open), `/analyses/[id]/invite` and `/guests` (Your guests: every pick across shows, read from the browser). A layout over the three analysis routes holds the analysis, the picks, the selected guest and the chat, so they carry across.

| # | W: web app | Days | |
| --- | --- | --- | --- |
| W1 | Design direction, tokens for light and dark, type, logo, layout shell | 0.5 | done |
| W2 | Data layer: the typed client, polling once a second while running, a host-facing message for every error code below | 0.25 | done |
| W3 | Find the show: search on submit (2 to 100 characters), pick from up to 5, "Echo can't analyse this show yet" with the featured shows; featured shows open instantly | 0.5 | done |
| W4 | Analysis page: the steps while running without layout shift, the audience map, the failed states | 0.5 | done |
| W5 | Guests: the ranked list with label, the three scores, reason, episode title, pitch and evidence; "No sweet spot yet, these come closest" when there's no sweet spot (26 Oct wording); who was left out and why | 0.5 | done |
| W6 | The fit, love back and reach chart (qloo.md, Scoring): reach across, fit up, love back as dot size, label as colour, the box of high fit and reach, whose ringed dots are the sweet spots; a dot and its row select each other | 0.5 | done |
| W7 | Guest details: the full episode idea, the guest's audience map next to the show's, and what the guest adds | 0.5 | done |
| W8 | Chat: the last 20 messages; `rerun` polls the new analysis and keeps the old one on screen until it's done (filter and taste-map reruns too, since W24); `rewrite` swaps one idea in place; the active filters shown, and a note when `episode_about.used` is null | 0.75 | done |
| W9 | Invite: pick 1 to 5 guests (any number since W21), optional host name and note, a draft each with a copy button, revise one ("shorter") | 0.5 | done |
| W10 | Briefing for one guest: rendered, with copy and print | 0.25 | done |
| W11 | What Qloo saw: every Qloo call of the analysis, with path, params, status, time and whether it was cached | 0.25 | done |
| W12 | Deploy: the Vercel project from `web/`, `NEXT_PUBLIC_ENGINE_URL`, the web origin in the engine's CORS list, the whole flow once on the live engine | 0.25 | done |
| W13 | Walkthrough as a judge: phone width, keyboard, screen reader, slow engine, every error below | 0.5 | done |
| W14 | Redesign as a broadcast-gallery dashboard, dark only and visual first: desk readout, meter bridge, fit-by-reach scope, multiviewer wall, preview monitor, audience spectrum, Qloo call timeline. Every number comes from the analysis or `/health`. Replaces W1's light and dark poster look | 1 | done |
| W15 | Redesign as a film-style targeting console with four tabs (Guests, Audience, Invite, Qloo) under a header with the show and the sweet-spot count. One view of the guests (the fit-by-reach scope and a ranked list, with the selected guest beside them) in place of W14's wall, bridge and scope. A colour per meaning, plain labels, the chat docked on every tab, the landing redone to match. Replaces W14 | 1 | done |
| W16 | From the 25 Oct call: the Qloo tab and every mention of Qloo out of the UI (the quota too, kept in `/health` for us); bigger fit and reach axis names, centred on their axes, that explain themselves on hover or tap, and the guests without a reach score in a lane inside the chart; Ask Echo as a round button at the bottom right that the chat panel opens out of; the sign-off name remembered in the browser, so Invite asks for it once; the landing no longer stuck on "Opening…" after Back | 0.5 | done |
| W17 | A calm look in place of the game-like console (To agree 8): neutral greys, light and dark with a toggle in the header (the system's by default, remembered in the browser), blue for actions and orange for the sweet spot, rounded panels and pill controls, no brackets, tick scales, glows or blinking. Each guest's three scores as a voiceprint (a lobe per score) in the list, the selected guest and the landing's key. The fit-by-reach chart as the main feature: the Safe and Long shot regions shaded and named, the top 10 guests named beside their dots, bigger love back sizes, the rest dimmed on hover. Score and label colours checked for colour blindness. Replaces W15's look | 1 | done |
| W18 | A page per guest. The Guests tab keeps the chart and the ranked list, with a short overview of the selected guest beside them (portrait, scores, label, idea, evidence, pick) and "Open guest". The guest's page lays the full analysis out in columns: the scores and Echo score, the idea and why, where the audiences meet, the full episode next to their fans, the briefing, with the previous and next guest. The episode loads when the page opens, once per guest per visit | 0.5 | done |
| W19 | The analysis page in reading order, without tabs (26 Oct review): the show and its sweet-spot count, the sweet spots to start with, the chart with a plain explanation, every guest ranked, what the listeners love. A guest opens in a panel beside the chart instead of on its own page (same URL, arrows for the next guest); the episode loads once the guest has been open for a moment, so stepping through guests doesn't write one each. Picks bring up a bar that leads to a separate invite page. Replaces W15's tabs and W18's page | 0.5 | done |
| W20 | What the listeners love as a taste map (To agree 7): the show in the middle, a slice per category, each taste a circle with its picture, closer and bigger for a stronger pull. Picking one shows it and, for a film, show, artist or brand, starts a run with it as `episode_about`. The chart's Balanced strip shaded and named. At the bottom of the page an Ask Echo section: scrolled to it, the round button flies in and the conversation opens out of it | 0.5 | done |
| W21 | No limit on picks (26 Oct, reverses the 25 Oct call's 5, Eleni to confirm): the invite page asks `/drafts` for 5 guests at a time in parallel, so the API's limit of 5 per request stays | 0.1 | done |
| W22 | The invite page complete (26 Oct, #40): a card per guest with their email (kept in the browser only), their own note and "Open in email"; drafts kept in the browser and editable, writing again asks before replacing a changed one; the briefing on each card. Engine: `notes` per guest on `/drafts`, the episode and briefing stored per analysis, guest and idea | 0.5 | done |
| W23 | Ask Echo and the episode theme (26 Oct, #41): an optional theme on the landing with examples (`filters.theme`, LLM only), a keyword mock chat whose reruns change the guests, rewrites and the conversation kept in the browser, an off state without an LLM, landing start errors that clear and retry | 0.5 | done |
| W24 | The analysis page agrees with itself (26 Oct, #42): filter controls with clearable chips, reruns in place, picks per show by entity ID, "Start with these" only sweet spots, the chart's count and labels, copy for when there are no ideas, 404 and error pages, the health badge rechecking | 0.5 | done |
| W25 | Who the guest is, and the practical details (26 Oct, #46 to #48): a short bio under each guest's name on the cards, the guest panel and the invite card, built in code from public work facts, and their official website beside the other links. The invite page asks for dates, fee or unpaid, in person or remote, length, release and a reply-by date, all optional and kept in the browser, with each guest's own dates and fee; the drafts state them and invent none | 0.5 | done |
| W27 | Fixes from the 27 Oct end to end test (Leonidas): the filter form above the guest cards; the chart names every sweet spot and keeps names inside the plot; the taste map's sweep can't widen a phone page, and its circles get bigger tap targets on touch screens; the run screen lists the engine's own steps (no ideas step when the server has no LLM, so it never sits at "5 / 5" while ideas are written); "Rank 02" on the cards; picks from earlier runs of the show stay invitable, drafted from the run they were picked in, with drafts and notes kept per show by entity ID; a reply-by example that is a real Friday; "Top match" only when the first result covers the query; a voiceprint's hover clears on scroll | 0.5 | done |
| W28 | More from the audience map (27 Oct, Leonidas, on `web/audience-map`, on trial: the team keeps what it wants). The circles are keyed by taste, so they glide when the map changes. An age bar and a country field above the map show it for one group of listeners: tastes new for that group get a dot, and the side lists what's new and what matters less to them. "Their fans next to yours": pick one of the top 10 guests and the ring becomes two circles, the show's listeners and the guest's fans, with what both love in the overlap and the guest's new tastes glowing on the right, counts from the full lists, a category filter; the guest panel links to it. A picked taste lists the guests its fans lean to most (open one from there) and asks Echo about it. Ask Echo's replies light the tastes they name (a note above the map says which, with Clear), can switch the map to an age group or country, link the guests they name, and offer "See it on the taste map" | 0.75 | on trial |
| W29 | Fixes from the 27 Oct user test (Leonidas; T1 to T3, C1 to C3, C5, E7): "Leave out" on each card and the guest panel ("We've had them on" or "Not for us"), kept per show in the browser, off every part of the page, listed under Left out with "Bring back", and sent as `exclude` with every rerun and chat request; the panel's "Their fans next to yours" as two circles of pictures (only yours, both, new to you) with a category filter, in place of the table; the age chart and a guest's age groups only when there's data; "Common ground" cut; the run of show timed to the invite page's length, without a second title; Far renamed One-way, with the chart's text saying so; the landing's theme says it shapes the ideas, not the guests, and its examples are all themes; Ask Echo keeps a conversation per run, carried to a rerun started from the page with a note | 0.5 | done |
| W30 | More in "Narrow the guests" (27 Oct, Leonidas): the filter panel also takes Episode about (a film, TV show, artist or brand by name, the engine's `episode_about`, until now only from the taste map or Ask Echo) and the episode theme (`filters.theme`, until now only on the landing). Either one starts a new run of the show, like fame, age and country. Kind of guest was checked, not built (To agree 10) | 0.2 | done |
| W31 | The invite side and Your guests (27 Oct, Leonidas, on `web/invite-dashboard`). The invite page's details are one row of chips that reads as a summary ("Next month · Remote · 45 min · Unpaid"): recording dates, in person or remote, length, and the fee as Unpaid or Paid with an optional amount; each chip opens its choices under the row. Release and reply-by are off the page ("Anything else" can say them; the engine and the OpenClaw skill still take them). The invite cards are all the height of the tallest, with the draft filling the space, the bio up to three lines, "Mark as sent" and a link to the guest on Your guests; the briefing moves off the card. Your guests (`/guests`, in the header with the number picked): every picked guest by show, where each invitation stands (not sent, sent, booked), and per guest the invitation, the briefing (kept in the browser once written), the episode plan and their fans next to yours, the longer material the guest panel drops (W32). All in the browser, no accounts | 0.5 | done |
| W32 | Analysis page trims from the 27 Oct UI review (Leonidas, on `web/ui-analysis`). The guest panel drops the briefing (it moves to the invite side, W31) and shows "Their fans next to yours" as one short row: two circles with the counts (only yours, both, new to you) and "See both on the taste map". "Narrow the guests" and its form are gone: fame, age, country, episode about, theme and clearing them go through Ask Echo, and the filter chips only show what's on. The landing has no theme field. The run screen fills in as the engine saves each step: what the listeners love as pictures (point at one for its name), the hosts and past guests struck out, then the first 10 guests with their labels and shared tastes, which can be picked while Echo writes the ideas (picks carry over to the page). Mock mode fills its run step by step the same way. No new Qloo calls. While production has no LLM, Ask Echo is off there, so the live site has no way to change the filters until OpenRouter is funded | 0.5 | done |
| W33 | Demo trims (29 Oct, Leonidas, on `web/demo-trims`): the run screen is back to the steps and the radar (before W32), so no guests or picks while it runs; no Left out list (Leave out on the cards, the guest panel and Ask Echo stays, and nothing in the page brings a guest back); the taste map has no age bar or country field; Ask Echo has no country filter and no longer points the map at one age group or country. The engine keeps `country` in `filters` and `/analyses/{id}/map` for the API, but the web app, the chat and the OpenClaw skill never use them. | 0.5 | done |
| W34 | A UI pass from the screen-by-screen review (29 Oct, Eleni, PR #55 on `web/ui-polish`, merged after W33; where they clash this one stands). The run screen is paced (each step's result holds 1.3 to 2.8 s while the engine works on) with one picture per step and no buttons: the radar, the tastes, the hosts and past guests as slashed initial badges, the guests dropping onto a small fit-by-reach chart, the first guests while their ideas are written. The taste map keeps an age bar, each age group's map loaded in the background once the map is in view (6 Qloo calls each, cached), and a country picker, so the web app uses `/analyses/{id}/map` again; Ask Echo still sets no age or country on the map (W33). No Leave out button on the cards or the guest panel (Ask Echo keeps it) and no Left out list (W33). The guest panel is up to 64rem wide from 1280 px, the guest beside the idea and evidence, then the episode and the two audiences as overlapping circles of pictures across it. Also: label hues on the chart, a wide ranked list with shared tastes in the middle, no arrows on search results | 0.5 | done |
| W35 | The invite page redesigned as letters, not a form (30 Oct, Eleni, on `web/invite-polish`), for the demo video. The header names the invitations ("Three invitations, one for each") beside a row of the guests' portraits ringed by where each stands (to write, writing, ready, sent, booked). Everyone's details are one sentence of tappable phrases ("We'd record whenever suits them, remotely, for 60 min, fee not mentioned."), each opening its choices in a small menu, starting from Flexible, Remote and 60 min with no fee; the details stay kept once the host clears them. Then a spread per guest: the large portrait, name, bio and voiceprint, a line just for them and their own dates and fee, held in view on a wide screen, beside the letter on a raised sheet (To, Subject, the body edited in place, then Ask Echo to rewrite, Copy and Open in email along its foot). A letter Echo has just written fills in from the top; while it writes, the blank sheet's lines shimmer. Marked as sent, the letter takes a stamp. A draft written before the host signs says "[Your name]" until they do, then their name. Mark as sent shows only once there is a draft | 0.5 | done |
| W26 | A UX pass on the analysis page (26 Oct, Eleni): once the show's header scrolls away, the status bar names the show and lists the page's sections with the current one marked (a menu on a phone); opening or closing a guest keeps what you pressed where it was while the page makes room for the panel, and focus goes back to it; the ranked list sorts by Echo score, fit, love back or reach, keeping the Echo rank; an analysis opens at the top; the invite page's examples read "e.g." | 0.3 | done |

W1 to W5 took about 2.25 days and are built on mock mode; W6 to W13 are about 3.5 more. W7 to W10 call L3 to L6 through the engine, and mock mode answers them all, so they don't wait for L.

**Deploying the web app** (W12, done 23 Oct). Vercel project `echo-web`, from this repo with Root Directory `web` and connected to git, so `main` deploys to production: https://echo-web-mu-taupe.vercel.app (`echo-web.vercel.app` was taken). Vercel detects Next.js, so there's no `vercel.json`. One variable, `NEXT_PUBLIC_ENGINE_URL` = `https://echo-qloo.vercel.app`, set for all environments. It's fixed into the browser bundle at build time, so changing it takes a redeploy, and a Vercel build without it stops with an error. The order it went in:

1. The engine first (Deploying the engine, below), for its URL.
2. The web project with `NEXT_PUBLIC_ENGINE_URL`, then deploy.
3. The web app's production URL into the engine's `ECHO_WEB_ORIGINS`, then redeploy the engine. CORS takes exact origins, so a preview deployment of the web app can't call the engine unless its URL is listed too.
4. Check on the production URL: the header shows neither "Example data" nor "Engine offline", a featured show opens at once, a search runs to the end. Done on 23 Oct with real shows at 1440 and 390, light and dark, apart from featured shows, which wait for `warm.py`.

**Errors.** The engine's `message` is already written for the host, so the app shows it as it comes and adds one next step:

- `show_unusable`, `daily_cap`: the featured shows, which still open.
- `filters_too_narrow`, `unknown_country`: back to the analysis before the change.
- `qloo_error`, `llm_error`, `engine_error`, the engine not answering: try again.
- `not_implemented`: only the part that called it says "not built yet"; the rest keeps working.
- `not_found`: back to the start. `bad_request`: the message next to the field.

## Dates

| Date | What |
| --- | --- |
| 23 Oct | Done: Q1 to Q17, the web app (W1 to W13), both deployed and checked on real shows |
| 24 to 26 Oct | L1 to L6 first version; the analysis page, invite and chat rebuilt; 35 gaps fixed (#39 to #42); featured shows warmed |
| 27 Oct | **Freeze** |
| 27 to 29 Oct | Together: Devpost text, README, screenshots, repo public, submit |

## To agree

1. **The bot.** Leonidas's pick on 26 Oct, Eleni to confirm: no hosted bot. Echo ships as an OpenClaw agent and skill (`openclaw/`, under v1) that a host adds to their own OpenClaw, and the demo video shows it, so the pitch line stays. The judges' live demo is the web app. Like the web app, the agent gets ideas, drafts and briefings from the public engine only once the OpenRouter key is in.
2. **The LLM in production.** Leonidas built L1 to L6 (25 Oct). Until the demo each of us runs them locally on our own Claude subscription. Before it: fund OpenRouter, `vercel env add OPENROUTER_API_KEY production` on `echo-qloo`, redeploy. The featured shows already have ideas, written by Claude locally through `warm.py` (26 Oct). Compare models on OpenRouter if there's time (The LLM, below).
3. **Featured shows.** Done 26 Oct (#39): comedy, music, sports and a business interview show, 3 or 4 sweet spots each, warmed to production. Titles are in `ECHO_FEATURED`, never the repo. Music is the weakest: its guests are mostly radio interviewers, not musicians.
4. **Politicians among the guests.** Decided 25 Oct (Leonidas, after the QA run): dropped in clean-up, with political commentators and convicts, by the English description ([qloo.md](qloo.md), Clean-up 7). Comedians and hosts who talk about politics stay. Eleni to confirm.
5. **The web app's domain.** `echo-web.vercel.app` was taken, so Vercel named it `echo-web-mu-taupe.vercel.app`. A clearer `*.vercel.app` name or our own domain before the judges see it.
6. **A 3D chart** (25 Oct call). Fit, love back and reach are three axes, so a 2D/3D toggle on the chart, if the 3D view isn't harder to read. After the UX pass; the tool is open.
7. **The Audience tab as a picture** (25 Oct call). Done 26 Oct (W20): a taste map around the show, a slice per category, closer and bigger for a stronger pull; picking a film, show, artist or brand runs Echo again with it as the episode's subject. Leonidas.
8. **The look** (25 Oct call). Done in W17: neutral, light and dark, blue for actions, orange for the sweet spot. The landing follows design 09 (25 Oct review); the `/designs` routes were removed on 27 Oct, before the repo goes public.
9. **The daily cap for judging.** 3,000 Qloo calls a day; a run is 29 to 66 calls, a guest panel about 6. #39 proposes 4,000 from 31 Oct to 5 Nov, then 3,000 again, which keeps the month's quota.
10. **Kind of guest** (27 Oct, checked, not built): a filter for founders and investors, comedians, athletes and so on, by Qloo's occupation tags. Qloo can do it with no extra calls ([qloo.md](qloo.md), Filters). It shows best across fields (comedians for a business show, athletes for a health show): a show's own list already leans to its field, so "founders and investors" changes little on a startup show. About half a day: the groups as allow-listed tag IDs in the engine, `filter.tags` on the candidate lists, the chat, mock mode, the panel and the skill. The user decides.

## The LLM

24 Oct (Eleni): a cheap open-weight model, **`openai/gpt-oss-120b`**, on Groq (#38). 25 Oct (Leonidas): calls go through **OpenRouter** instead, so one key can try several models and we keep the cheapest that writes well enough. gpt-oss-120b stays the default and the first candidate. 26 Oct (Eleni and Leonidas): **no Groq**. For now each of us runs L locally on our own Claude subscription (`claude-cli`, below); before the demo we put money on OpenRouter and set its key on Vercel.

- **Client:** `engine/echo_engine/llm_client.py`. A call is a system prompt, a user prompt and a JSON schema; it returns the parsed object with the model, tokens, cost and time. It retries a 429, a 5xx or an answer that isn't JSON, twice. `ECHO_LLM` picks the backend:
  - `openrouter`, the default and the only one in production: OpenAI-compatible API at `https://openrouter.ai/api/v1` with `OPENROUTER_API_KEY`, `response_format` with a strict JSON schema, and `provider.require_parameters`, so a request only goes to providers that support the schema. The cost comes back in every response.
  - `claude-cli`, local only: Leonidas's [claude-cli-wrapper](https://github.com/anagnole/claude-cli-wrapper) runs the Claude Code CLI on a Claude subscription behind an Anthropic Messages API at `http://127.0.0.1:4301`. Start it with `cd ~/Projects/claude-api && pnpm dev`. The engine sends the schema, turns the CLI's tools and MCP servers off and runs it in an empty folder outside the repo, so no `CLAUDE.md` is read. Default model `claude-sonnet-5-5`; model names must start with `claude-`. The engine refuses it on Vercel.
- `ECHO_LLM_MODEL` names the model on either backend and `ECHO_LLM_URL` overrides the URL. `scripts/llm_check.py` (`--backend`, `--model`, `--effort`) sends one small call and prints the time, tokens and cost. Through the wrapper, `claude-haiku-5-5` answered in 5 s on 25 Oct.
- **Building on Claude isn't testing the model.** Claude can hide what a cheap model gets wrong (broken JSON, facts the evidence doesn't give). Use `claude-cli` for the plumbing and the web app, and judge the prompts on OpenRouter models. `scripts/qa.py` with `ECHO_LLM` and `ECHO_LLM_MODEL` set runs every L step on one show with any model; run it on 3 or 4 cached shows per model and compare the reports, cost and time. Through the wrapper, an analysis with ideas takes 27 to 44 s, almost all of it the ideas call.
- **The chat (L4) returns a decision, not tool calls:** `{action: rerun | rewrite | answer, ...}` as structured output. The CLI ignores `tools` and gpt-oss can't mix tools with structured output, so this works the same on every model.
- **Strict schemas:** every property in `required`, `additionalProperties: false`, optional fields as `["string", "null"]`. gpt-oss is a reasoning model: effort low for the host check and medium for the writing; measure what L2 adds to the 5 to 10 s run.
- **Prices** (Eleni, 24 Oct, on Groq): gpt-oss-120b is $0.15 and $0.60 per million tokens in and out, so a run's ideas cost well under a cent. `qwen/qwen3.8-27b` is the step up if gpt-oss writes weak pitches; closed models cost 10 to 100 times more. Set a spend limit on the OpenRouter key.

## Hosting

Decided 23 Oct (Eleni): both pieces on Vercel (Pro plan), as two projects from this repo, `engine/` and `web/`. Railway was the other option (#5).

A Vercel function keeps nothing between requests and several instances can run at once. The engine from #5 assumes one process with a disk, so this moves to Neon Postgres and Upstash Redis in `us-east-1`, next to the engine in `iad1`:

| Today, one process | On Vercel |
| --- | --- |
| `Engine.analyses` in memory, and `.cache/analyses/*.json` | Neon Postgres, table `analyses`: id, request key, status, the analysis as JSON. The run writes it after every step, because a poll can land on another instance. |
| `DiskCache` in `.cache/qloo/` and `.cache/apple/` | Neon Postgres, table `cache`: key, gzipped body, expiry. Measured locally: about 27 KB a call, 1 MB a fresh analysis. Expired rows are deleted on about one write in 100. |
| `LocalCounters`: today's count in `.cache/usage.json`, the monthly quota in memory | `RedisCounters` in Upstash Redis: one counter per UTC day, taken before each fresh call so instances can't pass the cap together, and the last monthly quota Qloo reported |
| `RateLimiter`, 9 a second per process, evenly spaced | `RedisLimiter` in Upstash Redis: at most 9 calls in each clock second for all instances. Two full seconds back to back can put up to 18 calls within a second of each other; a 429 is retried. |
| Featured shows warmed at startup | `scripts/warm.py`, run locally with the production variables after each scoring change: fresh analyses into Postgres, and their IDs in table `featured`. `/featured` only reads them. |

- **Locally** nothing changes: without `DATABASE_URL` and the Upstash variables, `store.py` uses `.cache/` and memory, as today. Tests use the local store; the Postgres tests run when `TEST_DATABASE_URL` points at a throwaway UTF8 database. Neon's pooler doesn't keep prepared statements, so psycopg never prepares them.
- **Redis** is Upstash's REST API over HTTPS (`httpx`, no new dependency), so there's no connection to lose when Vercel freezes an instance. Each fresh Qloo call is 3 requests and 5 commands (about 250,000 commands if all 50,000 monthly calls were used). Every key expires. If Upstash fails, the throttle and the cap fail the request (`engine_error` in a run), never retried as Qloo's errors; saving the quota is best effort. Redis tests run on a fake Upstash, and on the real one when `TEST_UPSTASH_REDIS_REST_URL` and `TEST_UPSTASH_REDIS_REST_TOKEN` are set; they use their own keys, so the production database will do.
- **Background runs.** `POST /analyses` answers 202 and the run goes on in the same function, well inside the 300 s limit. Checked on the first deploy (23 Oct): the 202 came back in 0.5 s, polls on other requests saw each step saved, and the run was done in 9 s with 64 fresh Qloo calls. So no Vercel Queues. A run that hasn't saved for 3 minutes reads as failed (`engine_error`) and isn't reused, so a stopped run never polls forever.

### Deploying the engine

Set up 23 Oct. The Vercel project is `echo-qloo` (team "eleni's projects", Pro; a $5 on-demand budget with alerts at 50, 75 and 100%, and no pause, so the demo never goes dark during judging), Root Directory `engine`, production URL `https://echo-qloo.vercel.app`. `engine/pyproject.toml` points Vercel at `echo_engine.app:app` (`[tool.vercel]`), `engine/.python-version` pins Python 3.12, and `engine/vercel.json` runs the function in `iad1` for up to 300 s, without `tests/` and `scripts/`. Dependencies install from `pyproject.toml` and `uv.lock`. Every push to `main` deploys to production, except commits by an author outside the Vercel team: Vercel blocks those (Leonidas's, since 26 Oct), and they go live only with a deploy by hand or once he's on the team. A `vercel deploy --prod` from the checkout is blocked too, since the CLI sends the last commit's author. Deploy from a copy without git instead: `git archive HEAD engine web | tar -x -C <dir>`, put the project's `.vercel/project.json` in `<dir>` (`echo-qloo` or `echo-web`; both projects have their Root Directory set, so deploy from `<dir>`, not the subfolder), then `vercel deploy --prod --yes` from `<dir>` (27 Oct).

Neon and Upstash are standalone accounts, not Vercel Marketplace integrations, so Leonidas can be invited to them without a Vercel seat. Their variables are set on Vercel by hand.

- **Neon:** org "Echo", project `echo` in `aws-us-east-1`, PostgreSQL 18. Branch `main` is production and `dev` is for previews; both use the pooled URL. The engine creates its tables on first use.
- **Upstash:** team "echo", Redis database `echo` in `us-east-1`, Free plan, no eviction. Production and previews share it, so they share the throttle and the daily cap. The console's copy button gives the URL without `https://`; the engine adds it.

| Variable | Production | Preview |
| --- | --- | --- |
| `QLOO_API_KEY` | The hackathon key | Not set yet, so a preview deploy won't start |
| `DATABASE_URL` | Neon `main`, pooled | Neon `dev`, pooled |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | The `echo` database | The same |
| `ECHO_WEB_ORIGINS` | The web app's URL. CORS takes exact origins, comma-separated. | Not set: `http://localhost:3000` |
| `ECHO_DAILY_QLOO_CALLS` | Not set: 3000 | |
| `OPENROUTER_API_KEY` | Before the demo, once OpenRouter is funded | |
| `ECHO_LLM` | Not set: `openrouter`. Never `claude-cli`. | |
| `ECHO_LLM_MODEL` | Not set: `openai/gpt-oss-120b` | |

All of them are Sensitive. Add or change one with `vercel env add NAME production` from `engine/` (linked to the project; `engine/.vercel` is git-ignored), then `vercel redeploy <url> --target production`. Sensitive values can't be pulled back: `vercel env pull` gives placeholders. `ECHO_MOCK`, `ECHO_CACHE_DIR` and `ECHO_FEATURED` aren't used on Vercel.

On Vercel the engine won't start without `QLOO_API_KEY`, `DATABASE_URL` and the Upstash variables, and the function log names the missing ones, since an instance has no disk to fall back to. With `ECHO_MOCK=1` it needs none of them.

**Running against production locally.** The repo root has a git-ignored `.env.production` (mode 600, single-quoted values) with the production `DATABASE_URL`, `QLOO_API_KEY` and Upstash variables, copied from the Neon and Upstash consoles. From `engine/`, `set -a; source ../.env.production; set +a` loads them into the shell, where they override `.env`. Then `scripts/warm.py` writes the featured shows to production, and the Redis tests run on the real Upstash with `TEST_UPSTASH_REDIS_REST_URL` and `TEST_UPSTASH_REDIS_REST_TOKEN` set from them. Never point `TEST_DATABASE_URL` at either Neon branch: those tests drop their tables.

**Checking a deploy.** `/health` answers `"mock": false` with today's Qloo calls and the monthly quota from Upstash. `vercel logs --environment production --since 30m --json` from `engine/` shows the function log.

## API

JSON, no auth, CORS for the web app. Errors are `{ "error": "<code>", "message": "<text for the host>" }`. Examples are invented, never Qloo data.

| Method | Path | Body or params | Returns |
| --- | --- | --- | --- |
| GET | `/` | | `{ service, health, docs }`: what the engine is, for anyone who opens its URL. `/docs` is FastAPI's interactive API reference. |
| GET | `/health` | | `{ ok, qloo_calls_today, qloo_calls_left }` |
| GET | `/shows` | `q` (2 to 100 chars, on submit, not per keystroke) | `{ shows: [Show] }`, up to 5. Empty: not in Qloo. |
| GET | `/featured` | | `{ featured: [{ show: Show, analysis_id }] }`, empty until `scripts/warm.py` has run |
| POST | `/analyses` | `{ show_id, filters }` | 202 `{ id, status: "running" }`. Same show and filters reuse the earlier one, unless it was made by another pipeline version, has no bios, or has no ideas while the LLM is set up. |
| GET | `/analyses/{id}` | | The analysis below. Poll once a second while running. |
| GET | `/analyses/{id}/guests/{ref}` | `title`, `pitch`, `reason`: the idea as the chat rewrote it, all three or none; `length`: the episode length from the invite page, up to 30 characters | `{ ref, audience_map, adds, episode: { title, summary, segments: [{ title, points, minutes }], questions } or null }`. The episode keeps the idea's title; `minutes` only with a `length`. Written once per analysis, guest, idea and length, then stored. |
| GET | `/analyses/{id}/map` | `age` (a bucket), `country` (2 to 60 chars), either or both | `{ age, country, audience_map }`: the show's map for that group of listeners, 6 calls the first time. Neither: the analysis's own map. `unknown_country`, or `filters_too_narrow` when the group has no data (a place with no people). |
| GET | `/analyses/{id}/guests/{ref}/bridge` | | `{ ref, both, yours, theirs, totals }`: rows of up to 8 per category of what both audiences love, what only the show's listeners love and what the guest's fans add, and `totals: { category: { both, yours, theirs } }` over the full lists of 20. The same calls as the guest's details, so cached once the panel has opened. |
| GET | `/analyses/{id}/taste` | `category`, `name`, and the `age` and `country` the taste was seen with | `{ category, name, guests: [{ ref, affinity }] }`: every guest, the ones the taste's fans lean to most first. 1 call. Empty when Qloo can't use the taste as a signal (most books); 404 when it isn't on the map. |
| POST | `/chat` | `{ analysis_id, messages: [{ role, content }], exclude?, taste? }`, the last 20; `exclude`: the entity IDs the host left out, which the chat never sees and every rerun keeps (without it, the analysis's own); `taste` is `{ category, name, age?, country? }`, a taste the host asks about | `{ reply, action, analysis_id?, guest_ref?, idea?, why?, map?, guest_refs }` |
| POST | `/drafts` | `{ analysis_id, guest_refs, host_name?, note?, notes?: { ref: text }, details?, details_by_ref?: { ref: details } }` (each note up to 300 characters, something to say or how to write, such as a length or a tone, which wins over the default 100 to 160 words; `details` is `{ dates?, fee?, unpaid?, format?: in_person or remote, place?, length?, release?, reply_by? }`, a guest's own on top of the shared ones; notes and details only for refs in `guest_refs`; `ideas?: { ref: idea }`, a guest's rewritten idea), or one ref with `previous: { subject, body }` and `instruction` | `{ drafts: [{ guest_ref, subject, body }] }` |
| POST | `/briefings` | `{ analysis_id, guest_ref, idea?, length? }` (`idea`: the rewritten one; `length` as for the episode) | `{ markdown }`, written once per analysis, guest, idea and length, from the stored episode |

`Show` is `{ id, title, description, image_url }`.

`filters`: `fame` is `any`, `less_famous` or `rising`; `age` is null or a Qloo age bucket (`24_and_younger` to `55_and_older`); `country` is null or an English country name (nothing sets it since W33); `episode_about` is null or `{ query, type }` with type `movie`, `tv_show`, `artist`, `brand` or `videogame`. `theme` is null or free text up to 120 characters, for the LLM only (Qloo never sees it); it's part of the request key. `exclude` is a list of up to 50 entity IDs the host left out (web app: "Leave out"), dropped before the pool; part of the request key when not empty.

Chat `action`: `leave_out` (`guest_ref`, and `why`: `had_on` or `not_for_us`; the web app adds the guest to its left-out list), `rerun` (poll the new `analysis_id`), `rewrite` (`guest_ref` and the new `idea`, not saved in the analysis, which other visitors share: the web app keeps it in the browser and sends it back with the guest's details, drafts and briefing, so they're written for it) or `none`. With `none`, `map` is `{ category, tastes, age, country }` or null: where to point the taste map (tastes are names on the map, or for an age group or country the three it leans to most, which the engine also names in the reply), and `guest_refs` lists the guests the reply names. With `taste`, the engine gives the model the guests that taste's fans lean to most (1 call).

The analysis, when done:

```json
{
  "id": "an_00000002",
  "status": "done",
  "show": { "id": "00000000-0000-0000-0000-000000000001", "title": "Example Show", "description": "A weekly interview show about food.", "image_url": "https://example.com/show.jpg" },
  "filters": { "fame": "any", "age": null, "country": null, "episode_about": { "query": "Example Film", "type": "movie", "used": "Example Film (2019)" } },
  "steps": [{ "key": "map", "label": "Mapping your audience", "done": true }],
  "audience_map": [{ "category": "music", "items": [{ "name": "Example Band", "image_url": "https://example.com/band.jpg", "affinity": 0.93, "id": "00000000-0000-0000-0000-0000000000b1" }] }],
  "guests": [
    {
      "ref": "g1",
      "id": "00000000-0000-0000-0000-0000000000a1",
      "name": "Guest A",
      "description": "Stand-up comedian and actor",
      "bio": "Stand-up comedian and actor. Known for Example Comedy and Example Series.",
      "image_url": "https://example.com/a.jpg",
      "links": { "wikipedia": "https://en.wikipedia.org/wiki/Example", "imdb": "https://www.imdb.com/name/nm0000001/", "website": "https://example.com/a" },
      "label": "sweet_spot",
      "scores": { "fit": 0.74, "love_back": 0.41, "reach": 0.52, "echo": 0.55 },
      "evidence": { "shared_tastes": ["Example Podcast A", "Example tag"], "shared_podcasts": ["Example Podcast A"], "new_podcasts": ["Example Podcast B"], "ages": ["25_to_29", "30_to_34"] },
      "idea": { "reason": "Your listeners and Guest A's fans both tend to love example tag.", "title": "Example episode title", "pitch": "Two sentences on the episode." }
    }
  ],
  "left_out": [{ "name": "Host Person", "why": "host" }],
  "qloo_calls": [{ "path": "/v2/insights", "params": { "filter.type": "urn:entity:person", "take": "50" }, "status": 200, "duration_ms": 412, "cached": false, "at": "2026-10-23T10:00:01+00:00" }]
}
```

- While running: the same shape, with `steps` (`map`, `candidates`, `clean`, `score`, `evidence`, `ideas`) turning `done` and the lists still empty. Without an LLM on the server there is no `ideas` step.
- `version`: the pipeline version that made it (Q18).
- `guests`: up to 20, best first, all on the chart. The top 10 have `evidence` and `idea`; the rest have null.
- `scores` are percentiles from 0 to 1 ([qloo.md](qloo.md#scoring)). `fit` is fame-adjusted.
- `episode_about.used` is the matched name, with the year for a film, TV show or game; null when Qloo couldn't use the entity, and the web app says so.
- `label` `far` is shown as One-way: in the box of high fit and reach, but with low love back ([qloo.md](qloo.md#scoring)).
- `left_out.why` is `host` or `past_guest`. People who have died, politicians and convicts are dropped silently.
- `id` on a guest is the Qloo entity ID. `idea` and `episode` stay null until the LLM side writes them.
- Failed: `"status": "failed"` with `"error": { "error": "<code>", "message": "<text for the host>" }`. Codes: `show_unusable` (too few people, or love back can't be scored), `unknown_country`, `filters_too_narrow` (no guests match), `daily_cap` (reached during the run), `qloo_error`, `llm_error`, `engine_error`.

| Status | `error` |
| --- | --- |
| 400 | `bad_request` |
| 404 | `not_found` |
| 429 | `daily_cap`: the daily Qloo-call cap (`ECHO_DAILY_QLOO_CALLS`) is reached. Checked before every fresh Qloo call, so anything cached, like featured and earlier analyses, still opens. |
| 501 | `not_implemented`: a stub that isn't built yet. Gone by the freeze. |
| 502 | `qloo_error`, `llm_error` |

Analyses are saved as JSON next to the Qloo cache: in Postgres on Vercel, in `.cache/` locally ([Hosting](#hosting)). Only the search text and filter values reach Qloo; the host's name and notes go to the LLM only. A guest is shown with name, description, a bio built in code from public work facts (notable works, awards, employers, teams, start year, instruments), image and links, never gender, birth date, citizenship, family or political office.
