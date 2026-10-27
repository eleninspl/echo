#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const DETAILED = 10;
const POLL_MS = 1500;
const WAIT_MS = 180_000;
const REQUEST_MS = 120_000;
const RETRY_MS = 1000;
const TRANSIENT = new Set([500, 503, 504]);
const HISTORY = 20;
const MESSAGE_CHARS = 2000;
const THEME_CHARS = 120;
const DRAFTS_PER_REQUEST = 5;

const LABELS = {
  sweet_spot:
    "Sweet spot: your listeners tend to love them, and their fans are new to you and likely to enjoy the show",
  safe: "Safe: your listeners are likely to enjoy it, but few new ones come",
  far: "One-way: your listeners like them and their fans are new to you, but those fans may not stay",
  long_shot: "Long shot: their fans might come, but your listeners aren't into them",
  balanced: "Balanced: decent on each score, top on none",
};

const AGES = {
  "24_and_younger": "24 and younger",
  "25_to_29": "25 to 29",
  "30_to_34": "30 to 34",
  "35_to_44": "35 to 44",
  "45_to_54": "45 to 54",
  "55_and_older": "55 and older",
};

const FAME = { any: null, less_famous: "less famous guests", rising: "rising guests" };
const ABOUT_TYPES = ["movie", "tv_show", "artist", "brand", "videogame"];
const FORMATS = ["in_person", "remote"];
const DETAIL_FLAGS = {
  dates: "dates",
  fee: "fee",
  format: "format",
  place: "place",
  length: "length",
  release: "release",
  "reply-by": "reply_by",
};
const CATEGORIES = { tv: "TV", film: "Film", music: "Music", books: "Books" };
const category = (key) => CATEGORIES[key] ?? key.charAt(0).toUpperCase() + key.slice(1);

const USAGE = `Usage: node echo.mjs <command> [arguments]

  find <show name>                  look a podcast up in Echo
  featured                          shows with a ready analysis
  analyze <show_id> [filters]       rank guests for a show (up to a minute)
      --fame any|less_famous|rising
      --age ${Object.keys(AGES).join("|")}
      --country <English country name>
      --about <title or name> --about-type ${ABOUT_TYPES.join("|")}
      --theme <the episode's theme, up to ${THEME_CHARS} characters>
  results <analysis_id>             the ranked guests again
  guest <analysis_id> <ref> [--length <episode length>]
                                    a guest's full episode plan and their fans' tastes
  ask <analysis_id> <message>       ask Echo's agent about the results, or to rerun them
  invite <analysis_id> <ref>... [--host-name <name>] [--note <text>] [details]
                                    an invitation draft for each guest
      --dates <recording dates> --fee <fee> --unpaid
      --format ${FORMATS.join("|")} --place <where>
      --length <episode length> --release <when it's out> --reply-by <date>
  revise <analysis_id> <ref> <instruction>
                                    rewrite the last draft for a guest
  brief <analysis_id> <ref> [--length <episode length>]
                                    a briefing to read before recording`;

export class EchoError extends Error {}

function settings(env) {
  const trim = (url) => url.replace(/\/+$/, "");
  return {
    engine: trim(env.ECHO_ENGINE_URL || "https://echo-qloo.vercel.app"),
    web: trim(env.ECHO_WEB_URL || "https://echo-web-mu-taupe.vercel.app"),
    state: env.ECHO_STATE_DIR || join(tmpdir(), "echo-skill"),
  };
}

function client(config) {
  async function attempt(method, path, body) {
    try {
      return await fetch(config.engine + path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_MS),
      });
    } catch (error) {
      return error;
    }
  }
  return async function call(method, path, body) {
    let response = await attempt(method, path, body);
    if (method === "GET" && (response instanceof Error || TRANSIENT.has(response.status))) {
      await sleep(RETRY_MS);
      response = await attempt(method, path, body);
    }
    if (response instanceof Error) {
      throw new EchoError(`Echo's engine at ${config.engine} didn't answer (${response.message}).`);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.message ?? `The engine answered ${response.status}.`;
      throw new EchoError(data?.error ? `${message} (${data.error})` : message);
    }
    return data;
  };
}

function store(config) {
  const file = (kind, id) => join(config.state, `${kind}-${id.replace(/[^\w-]/g, "_")}.json`);
  return {
    async load(kind, id, fallback) {
      try {
        return JSON.parse(await readFile(file(kind, id), "utf8"));
      } catch {
        return fallback;
      }
    },
    async save(kind, id, value) {
      await mkdir(config.state, { recursive: true });
      await writeFile(file(kind, id), JSON.stringify(value));
    },
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const path = (...parts) => "/" + parts.map(encodeURIComponent).join("/");
const score = (value) => (value == null ? "not enough data" : String(Math.round(value * 100)));

function filterPhrases(filters) {
  const phrases = [];
  if (FAME[filters.fame]) phrases.push(FAME[filters.fame]);
  if (filters.age) phrases.push(`listeners ${AGES[filters.age]}`);
  if (filters.country) phrases.push(`in ${filters.country}`);
  if (filters.episode_about)
    phrases.push(`an episode about ${filters.episode_about.used ?? filters.episode_about.query}`);
  if (filters.theme) phrases.push(`theme "${filters.theme}"`);
  return phrases;
}

function tasteRows(rows, perRow) {
  return rows
    .filter((row) => row.items.length)
    .map(
      (row) =>
        `${category(row.category)}: ${row.items
          .slice(0, perRow)
          .map((item) => item.name)
          .join(", ")}`,
    );
}

function guestLines(guest, index, links, rewritten) {
  const detailed = index < DETAILED;
  const about = detailed && guest.bio ? null : guest.description;
  const head = `${index + 1}. ${guest.name} (${guest.ref})${about ? `: ${about}` : ""}`;
  const scores = guest.scores;
  const label = LABELS[guest.label] ?? guest.label;
  if (!detailed) return [`${head}. ${label.split(":")[0]}.`];
  const lines = [head];
  if (guest.bio) lines.push(`   ${guest.bio}`);
  lines.push(
    `   ${label}.`,
    `   Fit ${score(scores.fit)}, love back ${score(scores.love_back)}, reach ${score(scores.reach)} (percentiles among these guests)`,
  );
  const idea = rewritten ?? guest.idea;
  if (idea) {
    lines.push(
      `   Episode idea${rewritten ? " (as rewritten in chat)" : ""}: ${idea.title}`,
      `   Why them: ${idea.reason}`,
      `   Pitch: ${idea.pitch}`,
    );
  }
  const evidence = guest.evidence;
  if (evidence) {
    const facts = [];
    if (evidence.shared_tastes.length) facts.push(`Tastes both audiences share: ${evidence.shared_tastes.join(", ")}.`);
    if (evidence.new_podcasts.length) facts.push(`Podcasts their fans bring: ${evidence.new_podcasts.join(", ")}.`);
    if (evidence.ages.length)
      facts.push(
        `Ages where their fans stand out next to your listeners (not where most of them are): ${evidence.ages.map((age) => AGES[age]).join(", ")}.`,
      );
    if (facts.length) lines.push(`   ${facts.join(" ")}`);
  }
  lines.push(`   Guest page: ${links.guest(guest.ref)}`);
  if (guest.links?.website) lines.push(`   Website: ${guest.links.website}`);
  return lines;
}

function analysisText(analysis, config, rewrites = {}, left = []) {
  if (analysis.status === "failed") throw new EchoError(analysis.error?.message ?? "The analysis failed.");
  const links = {
    analysis: `${config.web}/analyses/${encodeURIComponent(analysis.id)}`,
    guest: (ref) => `${config.web}/analyses/${encodeURIComponent(analysis.id)}/guests/${encodeURIComponent(ref)}`,
  };
  const phrases = filterPhrases(analysis.filters);
  const leftIds = new Set(left.map((guest) => guest.id));
  const guests = analysis.guests.filter((guest) => !leftIds.has(guest.id));
  const lines = [
    `${analysis.show.title}: ${guests.length} guests${phrases.length ? `, ${phrases.join(", ")}` : ""}`,
    `Analysis ID: ${analysis.id}`,
    `See the chart in Echo: ${links.analysis}`,
  ];
  const about = analysis.filters.episode_about;
  if (about && !about.used) lines.push(`Echo couldn't use "${about.query}" as the topic, so these guests ignore it.`);
  if (!analysis.guests.some((guest) => guest.idea))
    lines.push("No episode ideas: the engine had no writing side when this analysis ran.");
  guests.forEach((guest, index) => lines.push("", ...guestLines(guest, index, links, rewrites[guest.ref])));
  const hosts = analysis.left_out.filter((person) => person.why === "host").map((person) => person.name);
  const past = analysis.left_out.filter((person) => person.why === "past_guest").map((person) => person.name);
  if (hosts.length || past.length || left.length) lines.push("");
  if (hosts.length) lines.push(`Left out as the show's hosts: ${hosts.join(", ")}.`);
  if (past.length) lines.push(`Left out as past guests: ${past.join(", ")}.`);
  if (left.length) lines.push(`Left out by the host: ${left.map((guest) => guest.name).join(", ")}.`);
  return lines.join("\n");
}

async function finished(call, id) {
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    const analysis = await call("GET", path("analyses", id));
    if (analysis.status !== "running") return analysis;
    if (Date.now() > deadline) throw new EchoError(`Analysis ${id} is still running. Check again with: results ${id}`);
    await sleep(POLL_MS);
  }
}

function needs(positionals, count, what) {
  if (positionals.length < count) throw new EchoError(`Missing ${what}.\n\n${USAGE}`);
}

function guestOf(analysis, ref) {
  const guest = analysis.guests.find((candidate) => candidate.ref === ref);
  if (!guest) throw new EchoError(`No guest ${ref} in analysis ${analysis.id}.`);
  return guest;
}

function draftText(draft, guest) {
  return [`To ${guest.name} (${guest.ref})`, `Subject: ${draft.subject}`, "", draft.body].join("\n");
}

function inviteDetails(values) {
  const details = {};
  for (const [flag, field] of Object.entries(DETAIL_FLAGS)) if (values[flag]) details[field] = values[flag];
  if (values.unpaid) details.unpaid = true;
  return details;
}

function draftRequest(id, refs, sent, rewrites) {
  const body = { analysis_id: id, guest_refs: refs };
  if (sent.host_name) body.host_name = sent.host_name;
  if (sent.note) body.note = sent.note;
  if (sent.details && Object.keys(sent.details).length) body.details = sent.details;
  const ideas = Object.fromEntries(refs.filter((ref) => rewrites[ref]).map((ref) => [ref, rewrites[ref]]));
  if (Object.keys(ideas).length) body.ideas = ideas;
  return body;
}

function batches(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

const COMMANDS = {
  async find({ positionals, call }) {
    needs(positionals, 1, "the show's name");
    const q = positionals.join(" ").trim();
    const { shows } = await call("GET", `/shows?q=${encodeURIComponent(q)}`);
    if (!shows.length) return `Echo has no podcast matching "${q}", so it can't analyse it.`;
    return shows
      .map((show, index) => {
        const about = show.description ? `\n   ${show.description.replace(/\s+/g, " ").slice(0, 200)}` : "";
        return `${index + 1}. ${show.title} (show_id ${show.id})${about}`;
      })
      .join("\n");
  },

  async featured({ call }) {
    const { featured } = await call("GET", "/featured");
    if (!featured.length) return "No featured shows yet.";
    return featured.map((item) => `${item.show.title}: analysis ${item.analysis_id}`).join("\n");
  },

  async analyze({ positionals, values, call, saved, report }) {
    needs(positionals, 1, "the show_id (from find)");
    const filters = { fame: values.fame ?? "any" };
    if (values.age) filters.age = values.age;
    if (values.country) filters.country = values.country;
    if (values.about) filters.episode_about = { query: values.about, type: values["about-type"] ?? "movie" };
    if (values.theme) filters.theme = values.theme;
    const left = await saved.load("left", positionals[0], []);
    if (left.length) filters.exclude = left.map((guest) => guest.id);
    const started = await call("POST", "/analyses", { show_id: positionals[0], filters });
    return report(await finished(call, started.id));
  },

  async results({ positionals, call, report }) {
    needs(positionals, 1, "the analysis ID");
    return report(await finished(call, positionals[0]));
  },

  async guest({ positionals, values, call, config, saved }) {
    needs(positionals, 2, "the analysis ID and the guest's ref");
    const [id, ref] = positionals;
    const analysis = await finished(call, id);
    const guest = guestOf(analysis, ref);
    const idea = (await saved.load("ideas", id, {}))[ref];
    const params = new URLSearchParams(idea ? { title: idea.title, pitch: idea.pitch, reason: idea.reason } : {});
    if (values.length) params.set("length", values.length);
    const query = params.size ? `?${params}` : "";
    const details = await call("GET", path("analyses", id, "guests", ref) + query);
    const lines = [`${guest.name} on ${analysis.show.title}`];
    if (guest.bio) lines.push(guest.bio);
    lines.push(`Guest page: ${config.web}${path("analyses", id, "guests", ref)}`);
    const episode = details.episode;
    if (episode) {
      lines.push("", `Episode: ${episode.title}`, episode.summary);
      episode.segments.forEach((segment, index) => {
        const minutes = segment.minutes ? ` (${segment.minutes} min)` : "";
        lines.push("", `${index + 1}. ${segment.title}${minutes}`, ...segment.points.map((point) => `   - ${point}`));
      });
      if (episode.questions.length)
        lines.push("", "Questions to ask:", ...episode.questions.map((question) => `- ${question}`));
    } else {
      lines.push("", "No episode plan: the engine has no writing side right now.");
    }
    const fans = tasteRows(details.audience_map, 5);
    if (fans.length) lines.push("", "Their fans love:", ...fans);
    const adds = tasteRows(details.adds, 5);
    if (adds.length) lines.push("", "New to your listeners:", ...adds);
    return lines.join("\n");
  },

  async ask({ positionals, call, saved, report }) {
    needs(positionals, 2, "the analysis ID and the message");
    const [id, ...words] = positionals;
    const analysis = await finished(call, id);
    const left = await saved.load("left", analysis.show.id, []);
    const history = await saved.load("chat", id, []);
    history.push({ role: "user", content: words.join(" ").slice(0, MESSAGE_CHARS) });
    const body = { analysis_id: id, messages: history.slice(-HISTORY) };
    if (left.length) body.exclude = left.map((guest) => guest.id);
    const reply = await call("POST", "/chat", body);
    history.push({ role: "assistant", content: reply.reply.slice(0, MESSAGE_CHARS) });
    const lines = [`Echo: ${reply.reply}`];
    if (reply.action === "rerun" && reply.analysis_id) {
      await saved.save("chat", reply.analysis_id, history.slice(-HISTORY));
      lines.push(
        "",
        `New analysis, use its ID from now on.`,
        "",
        await report(await finished(call, reply.analysis_id)),
      );
    } else {
      await saved.save("chat", id, history.slice(-HISTORY));
    }
    if (reply.action === "leave_out" && reply.guest_ref) {
      const guest = guestOf(analysis, reply.guest_ref);
      const why = reply.why ?? "not_for_us";
      await saved.save("left", analysis.show.id, [
        ...left.filter((other) => other.id !== guest.id),
        { id: guest.id, name: guest.name, why },
      ]);
      lines.push(
        "",
        `Left out ${guest.name} (${guest.ref}) as ${why === "had_on" ? "a past guest" : "not right for the show"}.`,
        "Results and reruns for this show leave them out from now on.",
      );
    }
    if (reply.action === "rewrite" && reply.guest_ref && reply.idea) {
      const rewrites = await saved.load("ideas", id, {});
      await saved.save("ideas", id, { ...rewrites, [reply.guest_ref]: reply.idea });
      lines.push(
        "",
        `New idea for ${reply.guest_ref}: ${reply.idea.title}`,
        `Why them: ${reply.idea.reason}`,
        `Pitch: ${reply.idea.pitch}`,
      );
    }
    return lines.join("\n");
  },

  async invite({ positionals, values, call, saved }) {
    needs(positionals, 2, "the analysis ID and at least one guest ref");
    const [id, ...refs] = positionals;
    const analysis = await finished(call, id);
    const guests = refs.map((ref) => guestOf(analysis, ref));
    const rewrites = await saved.load("ideas", id, {});
    const sent = { host_name: values["host-name"], note: values.note, details: inviteDetails(values) };
    const answers = await Promise.all(
      batches(refs, DRAFTS_PER_REQUEST).map((batch) =>
        call("POST", "/drafts", draftRequest(id, batch, sent, rewrites)),
      ),
    );
    const texts = [];
    for (const draft of answers.flatMap((answer) => answer.drafts)) {
      await saved.save("draft", `${id}-${draft.guest_ref}`, { ...sent, ...draft });
      texts.push(
        draftText(
          draft,
          guests.find((guest) => guest.ref === draft.guest_ref),
        ),
      );
    }
    return texts.join("\n\n---\n\n");
  },

  async revise({ positionals, call, saved }) {
    needs(positionals, 3, "the analysis ID, the guest's ref and what to change");
    const [id, ref, ...words] = positionals;
    const previous = await saved.load("draft", `${id}-${ref}`, null);
    if (!previous) throw new EchoError(`No earlier draft for ${ref}. Run: invite ${id} ${ref}`);
    const analysis = await finished(call, id);
    const body = {
      ...draftRequest(id, [ref], previous, await saved.load("ideas", id, {})),
      previous: { subject: previous.subject, body: previous.body },
      instruction: words.join(" "),
    };
    const [draft] = (await call("POST", "/drafts", body)).drafts;
    await saved.save("draft", `${id}-${ref}`, { ...previous, ...draft });
    return draftText(draft, guestOf(analysis, ref));
  },

  async brief({ positionals, values, call, saved }) {
    needs(positionals, 2, "the analysis ID and the guest's ref");
    const [id, ref] = positionals;
    const idea = (await saved.load("ideas", id, {}))[ref];
    const body = { analysis_id: id, guest_ref: ref };
    if (idea) body.idea = idea;
    if (values.length) body.length = values.length;
    const { markdown } = await call("POST", "/briefings", body);
    return markdown;
  },
};

export async function run(argv, env = process.env) {
  const [command, ...rest] = argv;
  if (!command || !COMMANDS[command]) throw new EchoError(USAGE);
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      fame: { type: "string" },
      age: { type: "string" },
      country: { type: "string" },
      about: { type: "string" },
      "about-type": { type: "string" },
      theme: { type: "string" },
      "host-name": { type: "string" },
      note: { type: "string" },
      dates: { type: "string" },
      fee: { type: "string" },
      unpaid: { type: "boolean" },
      format: { type: "string" },
      place: { type: "string" },
      length: { type: "string" },
      release: { type: "string" },
      "reply-by": { type: "string" },
    },
  });
  if (values.fame && !(values.fame in FAME)) throw new EchoError(`--fame is one of: ${Object.keys(FAME).join(", ")}`);
  if (values.age && !(values.age in AGES)) throw new EchoError(`--age is one of: ${Object.keys(AGES).join(", ")}`);
  if (values["about-type"] && !ABOUT_TYPES.includes(values["about-type"])) {
    throw new EchoError(`--about-type is one of: ${ABOUT_TYPES.join(", ")}`);
  }
  if (values.theme && values.theme.length > THEME_CHARS) {
    throw new EchoError(`--theme is at most ${THEME_CHARS} characters.`);
  }
  if (values.format && !FORMATS.includes(values.format)) {
    throw new EchoError(`--format is one of: ${FORMATS.join(", ")}`);
  }
  const config = settings(env);
  const saved = store(config);
  const report = async (analysis) =>
    analysisText(
      analysis,
      config,
      await saved.load("ideas", analysis.id, {}),
      await saved.load("left", analysis.show.id, []),
    );
  return COMMANDS[command]({ positionals, values, config, call: client(config), saved, report });
}

function invokedDirectly() {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  try {
    console.log(await run(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof EchoError ? error.message : `Echo failed: ${error.message}`);
    process.exitCode = 1;
  }
}
