# Echo

## The pitch

> **Echo: Find the Guest Who Carries Your Voice to New Ears**
>
> Ask an AI agent who to invite on a podcast, or what to talk about, and it suggests the same famous names and safe topics every show already has. Agents are culturally blind, and that's why most shows get stuck in an echo chamber, talking to the same people again and again. Echo wires Qloo into OpenClaw to break it. It maps what a show's audience loves across music, books, film, brands and places, then finds guests in the sweet spot: people the audience will love, who bring a new audience that will love the show back. Every match comes with a data-backed reason and an episode theme that bridges both worlds. Then OpenClaw does the work in Telegram, Slack or email, drafting the invitation, sending it only with the host's approval, and preparing a briefing before recording. A companion web app lets anyone explore their audience map instantly. Echo never scores private individuals and sends no personal data to Qloo.
>
> Stop echoing in the same room. Find the guest, and the story, that carries your voice somewhere new.

v1 has no OpenClaw bot: the chat in the web app is the agent. Whether the pitch line changes or the bot comes back after the freeze is open in [plan.md](plan.md).

## The problem

Podcasts grow mostly through guests: a guest brings their own audience, and some of it stays. Most hosts book on gut feel or whoever is trending, so they keep inviting people whose fans already listen. An AI assistant doesn't fix this: asked for guest ideas, it returns the famous names every show already has.

The question a host needs answered is not "who fits my show?" but "who fits my show **and** brings people who don't listen yet?" That takes data on what audiences like across categories, which Qloo has and a plain LLM doesn't.

## Who it's for

Podcast hosts and producers who book guests. Comedy, music and sports shows fit first, because Qloo knows the people those shows invite (comedians, musicians, athletes, actors, authors).

One judge is an angel investor who hosts a podcast and will personally invest $25,000 in a favourite entry. Echo is built for that person.

## Fit, love back and reach

- **Fit:** how much the show's audience likes the guest, beyond what the guest's fame alone predicts.
- **Love back:** how much the guest's audience likes the show.
- **Reach:** how new the guest's audience is to the show: how little the show's audience likes the guest audience's favourite podcasts.

The sweet spot is high on all three. High fit and low reach is safe but adds nobody. High reach and low love back brings people who won't stay. Reach and love back pull against each other on real data, so the sweet spot is rare (1 to 4 guests in 20), and the app says so. Formulas are in [qloo.md](qloo.md#scoring).

## Rules Echo follows

- Echo only scores public figures Qloo already knows. Never private individuals.
- No personal data goes to Qloo. Requests describe a show's audience, never a person.
- Results describe groups. A match is never a prediction about one listener, and Echo never infers anyone's identity, health, finances, politics or other sensitive traits.
- Echo sends nothing to a guest. The host gets the text and sends it themselves.
- No bulk scraping, and no Qloo data in the repo (it goes public).

## The hackathon

Qloo Agentic Hackathon 2026, online on Devpost. The brief: build an agent, or an app powered by one, that uses Qloo's taste data to do something it couldn't do without it. "If the project would work the same without Qloo, it is the wrong project."

| | |
| --- | --- |
| **Deadline** | **30 October 2026, 23:45 New York** (31 October, 05:45 Athens). We aim for 29 Oct. |
| Judging | 2 to 16 November |
| **Final** | **5 November:** the top 3 present live on air to the investor judge, the comedian judge and Qloo's CEO, answer questions and hear the result there. Finalists are told soon after the deadline. |
| Prizes | $15,000, $6,000, $4,000, plus the investor judge's $25,000. About 1,590 registered. |

A submission needs **a live hosted demo** judges can use start to finish (nothing that only runs on a laptop), **public source code** under an open licence (MIT, the repo goes public at submission) and **a written description** of what it does and why it needs Qloo. The guide also asks how a request turns into a result and what the limits are.

Four criteria, equal weight. Ties go to the first.

| Criterion | What judges ask | Echo's case |
| --- | --- | --- |
| Technical implementation | How thoroughly and well does it use Qloo? | Insights in both directions, cross-category maps, audience makeup, and every call shown in "What Qloo saw". |
| Design | A complete, coherent product? | Show name to invitation draft and briefing in one flow. |
| Potential impact | A real problem for a real audience? | Hosts and producers book guests every week. |
| Quality of the idea | Creative, non-obvious use of Qloo? | Nobody else does guest booking, and love back makes it a two-way match. |

Judges, by role: an angel investor who hosts a podcast, Qloo's CTO, an OpenAI board member with a legal background, an owner of major sports clubs, a comedian and actor, a Live Nation strategy executive. Last year (343 projects) three of the four winners were decision tools for businesses, and no plain consumer recommender won.

## Risks

- **Qloo mostly knows famous people.** It limits Echo to shows whose guests are public figures, and could make Echo suggest the famous names the pitch criticises. Fame-adjusted fit, the fame filter and reach push against it.
- **Small shows are missing from Qloo.** v1 says so and offers the featured shows. The demo uses shows we've checked.
- **Audience, not topic.** Qloo follows who listens, not what a show is about: a music interview show can point to journalists its listeners follow. That is the point, but the app has to say it, or a host reads it as a wrong answer.
- **Hosts come back as guests.** The investor judge shows up in the top 50 of their own shows, so host detection has to work on those shows.
- **Quota.** 50,000 Qloo calls a month for build and judging (about 49,000 left on 22 Oct, resets around 20 Nov). An analysis costs about 58. Featured shows are precomputed and there's a daily cap.
