# Plan (draft)

A starting point to discuss, not agreed yet. Ten days from 20 October to the deadline on 30 October, 23:45 New York.

## Timeline

| Days | Goal | Done when |
| --- | --- | --- |
| 20 to 21 Oct | **Prove the data.** Qloo key in, run the first checks from [qloo.md](qloo.md) on 5 to 10 real shows. | We have fit and reach numbers for real guests and they look sensible, not just a list of the most famous people. |
| 21 to 24 Oct | **Matching engine.** Show lookup, audience map, candidates, fit, love back, reach, reasons, episode theme. | One function takes a show name and returns ranked, explained matches. |
| 23 to 27 Oct | **Web app.** Audience map, fit against reach chart, match cards. Deployed on Vercel. | A judge can open a link, type a show and see matches. |
| 25 to 28 Oct | **OpenClaw agent.** One channel first. Matches in chat, draft invitation, approval step, briefing. | A judge can message the agent and go from show name to approved invitation. |
| 28 to 30 Oct | **Finish.** Polish, written description, README, demo shows, make the repo public, submit. | Submitted with a day to spare. |

## Open questions

1. **What judges try first.** The hosted demo has to work start to finish. The web app is the easiest to host and to try. Is the OpenClaw agent a second way in, or the main one?
2. **Which channel first.** Telegram, Slack or email? Telegram is probably the easiest for judges to try with no setup.
3. **Hosting OpenClaw.** The local OpenClaw setup runs the Claude CLI on a Max plan, which can't serve a public demo. A hosted agent needs the Anthropic API key and a small always-on server, since OpenClaw is a long-running gateway, not a Vercel function.
4. **Sending invitations in the demo.** Draft only, or send to the host's own inbox? Echo shouldn't email real guests from a hackathon demo.
5. **Who counts as a guest.** Only Qloo person entities, or also the hosts of other podcasts (through their podcast entities)?
6. **Demo shows.** Which 3 or so shows to feature, picked after the coverage checks. Comedy, music and sports first.
7. **Who does what.** Split between the two of us.
8. **Qloo quota.** 50,000 calls a month and 10 a second since 21 October (it was 10,000 and 5), resetting around 20 November. Judges' demo use counts against it. That's roughly 400 new shows at about 130 calls each, so it's no longer the tightest limit. Still precompute the featured demo shows, keep a cache that survives deploys (for example Vercel Blob or a Redis store from the Vercel Marketplace, not local files), and cap live analyses per visitor.

## Progress

- **20 Oct:** coverage probe run on 6 shows. Go. Reach needs a v2 before the scoring is locked. See [qloo.md](qloo.md).
- **21 Oct:** every Qloo API feature checked and mapped in [qloo-map.md](qloo-map.md). New options for Echo: who the new listeners are (demographics, one call), growing toward an age or interest group, and topic-led search.
