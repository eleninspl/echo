# Echo

## The pitch

> **Echo: Find the Guest Who Carries Your Voice to New Ears**
>
> Ask an AI agent who to invite on a podcast, or what to talk about, and it suggests the same famous names and safe topics every show already has. Agents are culturally blind, and that's why most shows get stuck in an echo chamber, talking to the same people again and again. Echo wires Qloo into OpenClaw to break it. It maps what a show's audience loves across music, books, film, brands and places, then finds guests in the sweet spot: people the audience will love, who bring a new audience that will love the show back. Every match comes with a data-backed reason and an episode theme that bridges both worlds. Then OpenClaw does the work in Telegram, Slack or email, drafting the invitation, sending it only with the host's approval, and preparing a briefing before recording. A companion web app lets anyone explore their audience map instantly. Echo never scores private individuals and sends no personal data to Qloo.
>
> Stop echoing in the same room. Find the guest, and the story, that carries your voice somewhere new.

## The problem

Podcasts grow mostly through guests: a guest brings their own audience, and some of it stays. Most hosts book on gut feel or whoever is trending, so they keep inviting people whose fans are already listening. An AI assistant doesn't fix this. Asked for guest ideas, it returns the same famous names every show already has.

The question a host actually needs answered is not "who fits my show?" but "who fits my show **and** brings people who don't listen yet?" Answering it takes data on what audiences like across categories, which is what Qloo has and a plain LLM doesn't.

## Who it's for

Podcast hosts and producers who book guests. The first good fit is comedy, music and sports shows, because Qloo knows the people those shows invite (comedians, musicians, athletes, actors, authors).

One of the six judges is an angel investor who hosts a podcast and will personally invest $25,000 in a favourite entry. Echo is built for exactly that person.

## How it works

1. **Find the show.** The host names their podcast. Echo looks it up in Qloo.
2. **Map the audience.** Echo asks Qloo what the show's audience over-indexes on across music, books, film, TV, brands and places. This is the audience map.
3. **Find candidates.** Echo asks Qloo which people the show's audience is likely to love.
4. **Score fit and reach.** For each candidate, Echo checks the other direction too: does the candidate's audience love the show back, and how much of that audience is new to it. See below.
5. **Explain each match.** Every pick comes with Qloo's own reason (which tastes connected them, with a strength score) and an episode theme that bridges both audiences.
6. **Do the work.** Through OpenClaw, Echo drafts the invitation, waits for the host to approve before sending anything, and prepares a briefing before recording.

## Fit and reach

This is the core idea and the part to prove first with real Qloo data. Working definitions, to be tested:

- **Fit:** how much the show's audience is predicted to like the guest. Qloo's affinity for the guest when the show is the input.
- **Love back:** how much the guest's audience is predicted to like the show. The same question asked from the guest's side.
- **Reach:** how different the guest's audience is from the show's. Tastes the guest's audience has that the show's audience doesn't.

The sweet spot is high fit, high love back and high reach. A guest with high fit and low reach is safe but adds nobody new. A guest with high reach and low love back brings people who won't stay. Plotted as fit against reach, this is the chart the web app is built around.

## Where people use it

- **OpenClaw agent** in Telegram, Slack or email: the working tool for hosts. Asks for the show, returns matches, drafts invitations, sends only after approval, prepares briefings.
- **Companion web app:** anyone can enter a show and explore its audience map and guest matches straight away, without setting anything up.

## Rules Echo follows

- Echo only scores public figures that Qloo already knows. It never scores private individuals.
- No personal data goes to Qloo. Requests describe a show's audience, never a person.
- Results describe groups. A match is never presented as a prediction about one listener.
- Nothing is sent to a guest without the host's explicit approval.

## Why it can win

| Criterion | Echo's case |
| --- | --- |
| Technical use of Qloo | Uses insights in both directions, explainability, cross-category taste and audience makeup. Ties go to this criterion. |
| Design | A complete flow from "name your show" to an approved invitation and a briefing. |
| Impact | A real, paying audience (hosts and producers) with a decision they make every week. |
| Idea | Our research found nobody else doing guest booking, and "love back" turns recommendation into a two-way match. |

## Risks

- **Qloo mostly knows famous people.** This matters twice: it limits Echo to shows whose guests are public figures, and it could make Echo suggest the same famous names the pitch criticises. Mitigation to test: Qloo's popularity filters, and the reach score itself, which penalises guests whose fans already listen.
- **Bland results.** If the audience map comes back as obvious picks, the demo loses its point. Check with real shows early.
- **Podcast coverage.** Smaller shows may be missing from Qloo. The demo should use shows we have confirmed are there.
- **Outreach in a demo.** Echo must not email real guests from a hackathon demo. Invitations should go to the host's own inbox or a test address.
- **Audience, not topic.** Qloo follows who listens, not what the show is about. A music interview show can point to journalists its listeners also follow. That is the point of Echo, but the app has to explain it, or a host will read it as a wrong answer.
- **Quota.** 50,000 Qloo calls a month for build and judging together (raised from 10,000 on 21 Oct). A full analysis costs roughly 25 to 130 calls, depending on how many guests are scored. The demo still needs a few precomputed featured shows and a persistent cache.

The first probe results (20 Oct) are in [qloo.md](qloo.md), under "Findings from real calls".
