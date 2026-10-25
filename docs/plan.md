# Plan (v1)

What we build by the **27 Oct freeze**, from the 22 Oct call. Only what the demo needs: anything not on this page is not in v1. The Qloo calls and the scoring are in [qloo.md](qloo.md).

## v1

Two pieces: the **engine** (Python, FastAPI) and the **web app** (Next.js), both on Vercel ([Hosting](#hosting)). The host types their show, picks it from a short list, and sees their audience map and 10 guests the audience will like, whose fans are new to the show and would like it back. Each guest has a reason, an episode title and a two-line pitch; a click opens the full episode idea and what that guest would add to the audience map. The host can ask for changes in a chat ("younger listeners", "less famous", "an episode about a film") and Echo runs again. The host picks one or more guests and gets an invitation draft for each, plus a briefing. Echo sends nothing.

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
11. **Qloo stays under the hood.** The UI doesn't name Qloo (25 Oct call, which cut the What Qloo saw tab); the analysis still returns `qloo_calls`.

3 or 4 featured shows, precomputed, open instantly from the landing page.

**Not in v1:** shows Qloo doesn't have, pasting Apple, Spotify or RSS links, the Telegram/OpenClaw bot, logins, sessions, SSE, sending or approving, checking a named guest, grow toward interests, cities or another show, topic tags, the plain-AI comparison (make it offline for the pitch if there's time), an after-episode summary.

## Engine tasks

One person each. **Q** talks to Qloo and does the maths: Eleni, from 23 Oct. **L** talks to the LLM: not assigned yet (point 2 under To agree). They meet in Python, in `engine/echo_engine/`:

| File | Owner | What's in it |
| --- | --- | --- |
| `models.py` | both | The API shapes below as Pydantic models. Change them together. |
| `app.py` | Q | The routes, background runs and mock mode. |
| `pipeline.py`, `scoring.py`, `cleanup.py`, `screen.py`, `apple.py` | Q | The analysis. `run_analysis` calls L1 and L2. |
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
| Q10 | Drop past guests: candidates whose full name is in one of the last 200 episode titles on Apple | 0.25 | done |
| Q11 | Fixes from the #5 review, below | 0.5 | done |
| Q12 | `store.py`: analyses, the Qloo and Apple caches behind one interface, local files or Postgres ([Hosting](#hosting)) | 0.5 | done |
| Q13 | Qloo throttle, daily cap and quota in Redis, shared by all instances | 0.25 | done |
| Q14 | Deploy: the Vercel project, Neon and Upstash, env vars, spend limit; check background runs | 0.5 | done |
| Q15 | Featured shows: `scripts/warm.py` writes them to the production store; `/featured` reads them | 0.25 | done |
| Q16 | End to end on the deployed engine: the 7 test shows and the investor judge's show, calls and time per run | 0.25 | done |
| Q17 | Evidence that differs per guest: on the investor judge's show, 9 of 20 guests share one reach value and the same two "new podcasts", and shared tastes are mostly one tag | 0.5 | done |

**Q11, the #5 review** ([comments](https://github.com/eleninspl/echo-qloo/pull/5)):

- The daily cap is checked by the Qloo client before every fresh call, so it covers every route; cached calls, like a featured show's, still work.
- `usable()`: a top person with no love back affinity moves on to the next of three, instead of failing the show.
- A running analysis is registered under its request key, so the same show and filters don't start a second run.
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

Q1 to Q17 are done and deployed. L1 to L6 have a first version (25 Oct, Leonidas): prompts in `llm.py`, one call each with a strict schema, checked end to end through the Claude wrapper on a real show. Next: compare models on OpenRouter and tune the prompts. Without `OPENROUTER_API_KEY` the engine treats L as not built, so production keeps working until the key is set. `scripts/analyze.py "<show>"` runs it from the terminal. Every prompt writes only from the evidence it's given, never invents facts about a person, never mentions sensitive traits and never calls a match a prediction about one listener. Every call goes through `llm_client.py`: OpenRouter in production, a Claude subscription locally ([The LLM](#the-llm)).

## Web app tasks

**W**, in `web/`: the whole v1 flow above, built against mock mode first (`ECHO_MOCK=1`), then on the live engine. The app talks to the engine only, from the browser, through `web/src/lib/echo.ts`. Three routes: `/` (find the show, featured shows), `/analyses/[id]` (everything else, so a featured show or a rerun is just another ID) and `/analyses/[id]/guests/[ref]` (one guest's page). A layout over the last two holds the analysis, the picks, the selected guest and the chat, so they carry across.

| # | W: web app | Days | |
| --- | --- | --- | --- |
| W1 | Design direction, tokens for light and dark, type, logo, layout shell | 0.5 | done |
| W2 | Data layer: the typed client, polling once a second while running, a host-facing message for every error code below | 0.25 | done |
| W3 | Find the show: search on submit (2 to 100 characters), pick from up to 5, "Echo can't analyse this show yet" with the featured shows; featured shows open instantly | 0.5 | done |
| W4 | Analysis page: the steps while running without layout shift, the audience map, the failed states | 0.5 | done |
| W5 | Guests: the ranked list with label, the three scores, reason, episode title, pitch and evidence; "No guest clears all three yet" when there's no sweet spot; who was left out and why | 0.5 | done |
| W6 | The fit, love back and reach chart (qloo.md, Scoring): reach across, fit up, love back as dot size, label as colour, the sweet-spot zone; a dot and its row select each other | 0.5 | done |
| W7 | Guest details: the full episode idea, the guest's audience map next to the show's, and what the guest adds | 0.5 | done |
| W8 | Chat: the last 20 messages; `rerun` polls the new analysis and keeps the old one on screen until it's done; `rewrite` swaps one idea in place; the active filters shown, and a note when `episode_about.used` is null | 0.75 | done |
| W9 | Invite: pick 1 to 5 guests, optional host name and note, a draft each with a copy button, revise one ("shorter") | 0.5 | done |
| W10 | Briefing for one guest: rendered, with copy and print | 0.25 | done |
| W11 | What Qloo saw: every Qloo call of the analysis, with path, params, status, time and whether it was cached | 0.25 | done |
| W12 | Deploy: the Vercel project from `web/`, `NEXT_PUBLIC_ENGINE_URL`, the web origin in the engine's CORS list, the whole flow once on the live engine | 0.25 | done |
| W13 | Walkthrough as a judge: phone width, keyboard, screen reader, slow engine, every error below | 0.5 | done |
| W14 | Redesign as a broadcast-gallery dashboard, dark only and visual first: desk readout, meter bridge, fit-by-reach scope, multiviewer wall, preview monitor, audience spectrum, Qloo call timeline. Every number comes from the analysis or `/health`. Replaces W1's light and dark poster look | 1 | done |
| W15 | Redesign as a film-style targeting console with four tabs (Guests, Audience, Invite, Qloo) under a header with the show and the sweet-spot count. One view of the guests (the fit-by-reach scope and a ranked list, with the selected guest beside them) in place of W14's wall, bridge and scope. A colour per meaning, plain labels, the chat docked on every tab, the landing redone to match. Replaces W14 | 1 | done |
| W16 | From the 25 Oct call: the Qloo tab and every mention of Qloo out of the UI (the quota too, kept in `/health` for us); bigger fit and reach axis names, centred on their axes, that explain themselves on hover or tap, and the guests without a reach score in a lane inside the chart; Ask Echo as a round button at the bottom right that the chat panel opens out of; the sign-off name remembered in the browser, so Invite asks for it once; the landing no longer stuck on "Opening…" after Back | 0.5 | done |
| W17 | A calm look in place of the game-like console (To agree 8): neutral greys, light and dark with a toggle in the header (the system's by default, remembered in the browser), blue for actions and orange for the sweet spot, rounded panels and pill controls, no brackets, tick scales, glows or blinking. Each guest's three scores as a voiceprint (a lobe per score) in the list, the selected guest and the landing's key. The fit-by-reach chart as the main feature: the Safe and Long shot regions shaded and named, the top 10 guests named beside their dots, bigger love back sizes, the rest dimmed on hover. Score and label colours checked for colour blindness. Replaces W15's look | 1 | done |
| W18 | A page per guest. The Guests tab keeps the chart and the ranked list, with a short overview of the selected guest beside them (portrait, scores, label, idea, evidence, pick) and "Open guest". The guest's page lays the full analysis out in columns: the scores and Echo score, the idea and why, where the audiences meet, the full episode next to their fans, the briefing, with the previous and next guest. The episode loads when the page opens, once per guest per visit | 0.5 | done |

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
| 24 to 26 Oct | L, once someone has it; featured shows; fixes |
| 27 Oct | **Freeze** |
| 27 to 29 Oct | Together: Devpost text, README, screenshots, repo public, submit |

## To agree

1. **The bot.** The pitch says Echo works through OpenClaw; v1's agent is the chat. Change the pitch line, or add the bot after the freeze if both halves finish early.
2. **Who builds L**, by 24 Oct. Q and the web app are done. L is about 3 days, so it has to start by 24 Oct to make the freeze. If it can't all fit, a proposed order by what the demo shows most: L2 ideas, L5 drafts, L3 the full episode, L6 briefing, L4 chat (the costliest), then L1 (Apple's author line already catches most hosts).
3. **Featured shows** by 25 Oct: comedy, music, sports and a business or tech interview show, each with at least 3 sweet spots. Consider the investor judge's own show for the last slot. Their titles or Qloo IDs go in `ECHO_FEATURED` in `.env`, never the repo; `scripts/warm.py` prints each one's sweet spots. A shortlist of 13 checked shows is with Eleni; music is the weakest genre.
4. **Politicians among the guests.** Candidate lists include politicians and political commentators (on 4 of the 13 shortlisted shows). Echo doesn't drop them. A guest suggestion that's a politician is a risk in front of the judges; dropping them would be a screen on the description and occupation tags, in clean-up.
5. **The web app's domain.** `echo-web.vercel.app` was taken, so Vercel named it `echo-web-mu-taupe.vercel.app`. A clearer `*.vercel.app` name or our own domain before the judges see it.
6. **A 3D chart** (25 Oct call). Fit, love back and reach are three axes, so a 2D/3D toggle on the chart, if the 3D view isn't harder to read. After the UX pass; the tool is open.
7. **The Audience tab as a picture** (25 Oct call). It's lists and numbers now. Ideas: a map coloured by strength, clicking a weak area to ask for guests who grow it. Names (shows, films) have no coordinates, so it needs a layout first, at most 2 or 3 dimensions. Leonidas.
8. **The look** (25 Oct call). Done in W17: neutral, light and dark, blue for actions, orange for the sweet spot. The home page still waits for the team's pick from `/designs`.

## The LLM

24 Oct (Eleni): a cheap open-weight model, **`openai/gpt-oss-120b`**, on Groq (#38). 25 Oct (Leonidas): calls go through **OpenRouter** instead, so one key can try several models and we keep the cheapest that writes well enough. gpt-oss-120b stays the default and the first candidate. Eleni to confirm.

- **Client:** `engine/echo_engine/llm_client.py`. A call is a system prompt, a user prompt and a JSON schema; it returns the parsed object with the model, tokens, cost and time. It retries a 429, a 5xx or an answer that isn't JSON, twice. `ECHO_LLM` picks the backend:
  - `openrouter`, the default and the only one in production: OpenAI-compatible API at `https://openrouter.ai/api/v1` with `OPENROUTER_API_KEY`, `response_format` with a strict JSON schema, and `provider.require_parameters`, so a request only goes to providers that support the schema. The cost comes back in every response.
  - `claude-cli`, local only: Leonidas's [claude-cli-wrapper](https://github.com/anagnole/claude-cli-wrapper) runs the Claude Code CLI on a Claude subscription behind an Anthropic Messages API at `http://127.0.0.1:4301`. Start it with `cd ~/Projects/claude-api && pnpm dev`. The engine sends the schema, turns the CLI's tools and MCP servers off and runs it in an empty folder outside the repo, so no `CLAUDE.md` is read. Default model `claude-sonnet-5-5`; model names must start with `claude-`. The engine refuses it on Vercel.
- `ECHO_LLM_MODEL` names the model on either backend and `ECHO_LLM_URL` overrides the URL. `scripts/llm_check.py` (`--backend`, `--model`, `--effort`) sends one small call and prints the time, tokens and cost. Through the wrapper, `claude-haiku-5-5` answered in 5 s on 25 Oct.
- **Building on Claude isn't testing the model.** Claude can hide what a cheap model gets wrong (broken JSON, facts the evidence doesn't give). Use `claude-cli` for the plumbing and the web app, and judge the prompts on OpenRouter models. Next: a script that runs L2 for 3 cached shows on several models and puts the pitches, cost and time side by side; rerun it after prompt changes.
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

Set up 23 Oct. The Vercel project is `echo-qloo` (team "eleni's projects", Pro; a $5 on-demand budget with alerts at 50, 75 and 100%, and no pause, so the demo never goes dark during judging), Root Directory `engine`, production URL `https://echo-qloo.vercel.app`. `engine/pyproject.toml` points Vercel at `echo_engine.app:app` (`[tool.vercel]`), `engine/.python-version` pins Python 3.12, and `engine/vercel.json` runs the function in `iad1` for up to 300 s, without `tests/` and `scripts/`. Dependencies install from `pyproject.toml` and `uv.lock`. Every push to `main` deploys to production.

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
| `OPENROUTER_API_KEY` | When L is built | |
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
      "idea": { "reason": "Your listeners and Guest A's fans both tend to love example tag.", "title": "Example episode title", "pitch": "Two sentences on the episode." }
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
- Failed: `"status": "failed"` with `"error": { "error": "<code>", "message": "<text for the host>" }`. Codes: `show_unusable` (too few people, or love back can't be scored), `unknown_country`, `filters_too_narrow` (no guests match), `daily_cap` (reached during the run), `qloo_error`, `llm_error`, `engine_error`.

| Status | `error` |
| --- | --- |
| 400 | `bad_request` |
| 404 | `not_found` |
| 429 | `daily_cap`: the daily Qloo-call cap (`ECHO_DAILY_QLOO_CALLS`) is reached. Checked before every fresh Qloo call, so anything cached, like featured and earlier analyses, still opens. |
| 501 | `not_implemented`: a stub that isn't built yet. Gone by the freeze. |
| 502 | `qloo_error`, `llm_error` |

Analyses are saved as JSON next to the Qloo cache: in Postgres on Vercel, in `.cache/` locally ([Hosting](#hosting)). Only the search text and filter values reach Qloo; the host's name and notes go to the LLM only. A guest is shown with name, description, image and links, never gender, birth date or family.
