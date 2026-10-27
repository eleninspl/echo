import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, test } from "node:test";

import { EchoError, run } from "./echo.mjs";

const example = JSON.parse(
  await readFile(new URL("../../../engine/echo_engine/fixtures/example.json", import.meta.url), "utf8"),
);

let env;
let requests;
let routes;
const realFetch = globalThis.fetch;

function reply(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(async () => {
  env = {
    ECHO_ENGINE_URL: "http://engine.test/",
    ECHO_WEB_URL: "http://web.test",
    ECHO_STATE_DIR: await mkdtemp(join(tmpdir(), "echo-skill-")),
  };
  requests = [];
  routes = {
    "GET /shows": () => reply(200, { shows: example.shows }),
    "POST /analyses": () => reply(202, { id: "an_example", status: "running" }),
    "GET /analyses/an_example": () => reply(200, example.analysis),
    "GET /analyses/an_nope": () => reply(404, { error: "not_found", message: "There's no analysis with that ID." }),
    "POST /drafts": (body) =>
      reply(200, {
        drafts: body.guest_refs.map((ref) => ({
          guest_ref: ref,
          subject: `Hello ${ref}`,
          body: body.instruction ?? "First draft",
        })),
      }),
  };
  globalThis.fetch = async (url, init = {}) => {
    const { pathname, search } = new URL(url);
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ method, pathname, search, body });
    const route = routes[`${method} ${pathname}`];
    if (!route) return reply(404, { error: "not_found", message: `No route ${method} ${pathname}` });
    return route(body);
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("find lists each show with its ID", async () => {
  const text = await run(["find", "example", "show"], env);
  assert.match(text, /1\. Example Show \(show_id 00000000-0000-0000-0000-000000000001\)/);
  assert.equal(requests[0].pathname, "/shows");
});

test("analyze sends the filters, waits for the run and links each guest", async () => {
  let polls = 0;
  routes["GET /analyses/an_example"] = () =>
    reply(200, ++polls < 2 ? { ...example.analysis, status: "running", guests: [] } : example.analysis);
  const text = await run(
    ["analyze", "show-1", "--fame", "rising", "--about", "Example Film", "--about-type", "movie"],
    env,
  );
  assert.deepEqual(requests[0].body, {
    show_id: "show-1",
    filters: { fame: "rising", episode_about: { query: "Example Film", type: "movie" } },
  });
  assert.equal(polls, 2);
  assert.match(text, /Analysis ID: an_example/);
  assert.match(text, /See the chart in Echo: http:\/\/web\.test\/analyses\/an_example/);
  assert.match(text, /1\. Guest L \(g1\)/);
  assert.match(text, /Guest page: http:\/\/web\.test\/analyses\/an_example\/guests\/g1/);
  assert.match(text, /Left out as the show's hosts: Host Person\./);
  assert.match(text, /Left out as past guests: Guest Z\./);
});

test("a failed analysis gives the engine's message", async () => {
  const failure = example.mock_failures[0];
  routes["GET /analyses/an_example"] = () =>
    reply(200, {
      ...example.analysis,
      status: "failed",
      guests: [],
      error: { error: failure.error, message: failure.message },
    });
  await assert.rejects(run(["analyze", "show-1"], env), { message: failure.message });
});

test("engine errors come through as written", async () => {
  await assert.rejects(run(["results", "an_nope"], env), (error) => {
    assert.ok(error instanceof EchoError);
    assert.equal(error.message, "There's no analysis with that ID. (not_found)");
    return true;
  });
});

test("a read that fails once on the server is tried again", async () => {
  let calls = 0;
  routes["GET /shows"] = () =>
    ++calls === 1 ? new Response("Internal Server Error", { status: 500 }) : reply(200, { shows: example.shows });
  assert.match(await run(["find", "example"], env), /Example Show/);
  assert.equal(calls, 2);
});

test("bad filters are refused before calling the engine", async () => {
  await assert.rejects(run(["analyze", "show-1", "--age", "40"], env), /--age is one of/);
  assert.equal(requests.length, 0);
});

test("revise sends the last draft back with the instruction", async () => {
  await run(["invite", "an_example", "g1", "g2", "--host-name", "Alex Example"], env);
  assert.deepEqual(requests.at(-1).body, {
    analysis_id: "an_example",
    guest_refs: ["g1", "g2"],
    host_name: "Alex Example",
  });
  const text = await run(["revise", "an_example", "g1", "Much", "shorter"], env);
  assert.deepEqual(requests.at(-1).body, {
    analysis_id: "an_example",
    guest_refs: ["g1"],
    previous: { subject: "Hello g1", body: "First draft" },
    instruction: "Much shorter",
    host_name: "Alex Example",
  });
  assert.match(text, /^To Guest L \(g1\)\nSubject: Hello g1\n\nMuch shorter$/);
});

test("revise without a draft says to invite first", async () => {
  await assert.rejects(run(["revise", "an_example", "g3", "shorter"], env), /Run: invite an_example g3/);
});

test("a rerun from chat prints the new analysis and keeps the conversation", async () => {
  routes["POST /chat"] = () =>
    reply(200, { reply: "Running again for younger listeners.", action: "rerun", analysis_id: "an_new" });
  routes["GET /analyses/an_new"] = () => reply(200, { ...example.analysis, id: "an_new" });
  const text = await run(["ask", "an_example", "Younger", "listeners"], env);
  assert.match(text, /^Echo: Running again for younger listeners\./);
  assert.match(text, /Analysis ID: an_new/);
  routes["POST /chat"] = () => reply(200, { reply: "Because of road trips.", action: "none" });
  await run(["ask", "an_new", "Why", "Guest L?"], env);
  assert.deepEqual(requests.at(-1).body.messages, [
    { role: "user", content: "Younger listeners" },
    { role: "assistant", content: "Running again for younger listeners." },
    { role: "user", content: "Why Guest L?" },
  ]);
});

test("analyze sends the theme and shows each guest's bio", async () => {
  const text = await run(["analyze", "show-1", "--theme", "road trips"], env);
  assert.deepEqual(requests[0].body, { show_id: "show-1", filters: { fame: "any", theme: "road trips" } });
  assert.match(text, /1\. Guest L \(g1\)\n   Sketch comedian\. Known for Example Sketch Show/);
});

test("ages are where a guest's fans stand out, not their main ages", async () => {
  const text = await run(["analyze", "show-1"], env);
  assert.match(
    text,
    /Ages where their fans stand out next to your listeners \(not where most of them are\): 25 to 29, 30 to 34\./,
  );
  assert.doesNotMatch(text, /main ages/);
});

test("a theme over 120 characters is refused before calling the engine", async () => {
  await assert.rejects(run(["analyze", "show-1", "--theme", "x".repeat(121)], env), /--theme is at most 120/);
  assert.equal(requests.length, 0);
});

test("an idea rewritten in chat is used for the ranking, the episode, drafts and the briefing", async () => {
  const idea = { reason: "Both audiences love road trips.", title: "Road trip episode", pitch: "Two sentences." };
  routes["POST /chat"] = () => reply(200, { reply: "Rewrote it.", action: "rewrite", guest_ref: "g1", idea });
  routes["GET /analyses/an_example/guests/g1"] = () => reply(200, { ...example.guest_details, ref: "g1" });
  routes["POST /briefings"] = () => reply(200, { markdown: "# Briefing" });
  assert.match(await run(["ask", "an_example", "Make", "it", "about", "road", "trips"], env), /New idea for g1/);
  assert.match(
    await run(["results", "an_example"], env),
    /Episode idea \(as rewritten in chat\): Road trip episode\n   Why them: Both audiences love road trips\./,
  );
  await run(["guest", "an_example", "g1"], env);
  const query = new URLSearchParams(requests.at(-1).search);
  assert.deepEqual(Object.fromEntries(query), { title: idea.title, pitch: idea.pitch, reason: idea.reason });
  await run(["invite", "an_example", "g1", "g2"], env);
  assert.deepEqual(requests.at(-1).body.ideas, { g1: idea });
  await run(["revise", "an_example", "g1", "shorter"], env);
  assert.deepEqual(requests.at(-1).body.ideas, { g1: idea });
  await run(["brief", "an_example", "g1"], env);
  assert.deepEqual(requests.at(-1).body, { analysis_id: "an_example", guest_ref: "g1", idea });
});

test("invite sends the practical details, keeps them for a revision and asks 5 guests at a time", async () => {
  const refs = example.analysis.guests.slice(0, 7).map((guest) => guest.ref);
  const text = await run(
    ["invite", "an_example", ...refs, "--dates", "early November", "--unpaid", "--format", "remote", "--note", "Hi"],
    env,
  );
  const sent = requests.filter((request) => request.pathname === "/drafts").map((request) => request.body);
  assert.deepEqual(
    sent.map((body) => body.guest_refs),
    [refs.slice(0, 5), refs.slice(5)],
  );
  assert.deepEqual(sent[0].details, { dates: "early November", format: "remote", unpaid: true });
  assert.equal(sent[0].note, "Hi");
  assert.equal(text.split("\n\n---\n\n").length, 7);
  await run(["revise", "an_example", refs[6], "warmer"], env);
  assert.deepEqual(requests.at(-1).body.details, { dates: "early November", format: "remote", unpaid: true });
});

test("a bad format is refused before calling the engine", async () => {
  await assert.rejects(run(["invite", "an_example", "g1", "--format", "zoom"], env), /--format is one of/);
  assert.equal(requests.length, 0);
});

test("runs when called through a symlink", async () => {
  const link = join(await mkdtemp(join(tmpdir(), "echo-link-")), "echo.mjs");
  await symlink(fileURLToPath(new URL("./echo.mjs", import.meta.url)), link);
  await assert.rejects(promisify(execFile)(process.execPath, [link]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /^Usage: node echo\.mjs/);
    return true;
  });
});
