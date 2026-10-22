import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { findShow, isDeceased, podcastNeighbours } from "../src/lib/echo/signals";
import { fileCache } from "../src/lib/qloo/cache";
import { QlooError, createQlooClient } from "../src/lib/qloo/client";
import type { Params, QlooEntity } from "../src/lib/qloo/types";

type Json = { [key: string]: unknown };
type Outcome = { result: "works" | "empty" | "no effect" | "error"; note: string };
type Check = { group: string; feature: string; call: string; run: () => Promise<Outcome> };

const PERSON = "urn:entity:person";
const PODCAST = "urn:entity:podcast";
const showName = process.argv[2] ?? "SmartLess";

const apiKey = process.env.QLOO_API_KEY;
if (!apiKey) {
  console.error("QLOO_API_KEY is not set. Run: scripts/set-env.sh QLOO_API_KEY");
  process.exit(1);
}
const qloo = createQlooClient({ apiKey, baseUrl: process.env.QLOO_BASE_URL, cache: fileCache() });

const obj = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
const list = (value: unknown): Json[] => (Array.isArray(value) ? (value as Json[]) : []);
const keys = (value: unknown) => Object.keys(obj(value)).sort().join(", ") || "none";
const idOf = (item: Json) => String(item.entity_id ?? item.tag_id ?? item.id ?? "");

function items(data: Json, field?: string): Json[] {
  if (Array.isArray(data.results)) return list(data.results);
  const results = obj(data.results);
  if (field) return list(results[field]);
  const firstArray = Object.values(results).find(Array.isArray);
  return list(firstArray);
}

const get = (endpoint: string, params: Params) => qloo.get<Json>(endpoint, params);
const insights = (params: Params & { "filter.type": string }) => get("/v2/insights", params);
const works = (note: string): Outcome => ({ result: "works", note });
const empty = (note = "200 with no results"): Outcome => ({ result: "empty", note });

function tally(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([value, count]) => `${value} ${count}`).join(", ");
}

const show = await findShow(qloo, showName);
if (!show) {
  console.error(`${showName} not found`);
  process.exit(1);
}
const baselineParams = { "filter.type": PERSON, "signal.interests.entities": show.entity_id, take: 50 };
const baseline = items(await insights(baselineParams), "entities");
const baselineIds = baseline.map(idOf);
const guests = (baseline as unknown as QlooEntity[]).filter((person) => !isDeceased(person)).slice(0, 4);
const guestIds = guests.map((guest) => guest.entity_id);
const [guest1, guest2] = guestIds as [string, string];
const neighbour = (await podcastNeighbours(qloo, show.entity_id, 50)).find(
  (pod) => pod.entity_id !== show.entity_id,
);

function versusBaseline(entities: Json[]): Outcome {
  if (!entities.length) return empty();
  const got = entities.map(idOf);
  const outside = got.filter((id) => !baselineIds.includes(id)).length;
  const moved = got.slice(0, 10).filter((id, index) => baselineIds[index] !== id).length;
  if (!outside && !moved && got.length === baselineIds.length) {
    return { result: "no effect", note: "identical to the baseline" };
  }
  return works(`${got.length} results, ${outside} not in the baseline top 50, ${moved}/10 top spots changed`);
}

const personWith = async (params: Params) =>
  versusBaseline(items(await insights({ ...baselineParams, ...params }), "entities"));

const runtime: { topicTag?: string; occupationTag?: string; audience?: string; wikidata?: string; imdb?: string } = {};
const externalOf = (item: Json | undefined) => obj(obj(item?.properties).external);
const firstExternalId = (value: unknown) => idOf(Array.isArray(value) ? obj(value[0]) : obj(value));
const occupation = list(guests[0]?.tags).find((tag) => String(tag.type ?? "").includes("occupation"));
if (occupation) runtime.occupationTag = idOf(occupation);

const checks: Check[] = [
  {
    group: "Lookup",
    feature: "Search people by name",
    call: "/search types=person",
    async run() {
      const found = items(await get("/search", { query: guests[0]?.name ?? "", types: PERSON, take: 3 }));
      return found.some((item) => idOf(item) === guest1) ? works("finds the person by name") : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Search sorted by popularity",
    call: "/search sort_by=popularity",
    async run() {
      const found = items(await get("/search", { query: "comedy", types: PODCAST, sort_by: "popularity", take: 10 }));
      const pops = found.map((item) => Number(item.popularity ?? 0));
      const sorted = pops.every((value, index) => index === 0 || value <= pops[index - 1]!);
      return found.length ? works(`${found.length} results, sorted by popularity: ${sorted}`) : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Entities by ID",
    call: "/entities?entity_ids=",
    async run() {
      const found = items(await get("/entities", { entity_ids: [show.entity_id, ...guestIds.slice(0, 2)] }));
      const external = found.map((item) => keys(externalOf(item)));
      runtime.wikidata = firstExternalId(externalOf(found[0]).wikidata) || undefined;
      runtime.imdb = firstExternalId(externalOf(found[1]).imdb) || undefined;
      return found.length
        ? works(`${found.length}/3 returned. Properties: ${keys(found[1]?.properties)}. External IDs (in properties.external): ${external.join(" | ")}`)
        : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Entities by Wikidata ID",
    call: "/entities?external.wikidata.ids=",
    async run() {
      if (!runtime.wikidata) return { result: "error", note: "no Wikidata ID on the show to test with" };
      const found = items(await get("/entities", { "external.wikidata.ids": runtime.wikidata }));
      return found.some((item) => idOf(item) === show.entity_id) ? works("resolves back to the same show") : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Entities by IMDb ID",
    call: "/entities?external.imdb.ids=",
    async run() {
      if (!runtime.imdb) return { result: "error", note: "no IMDb ID on the person to test with" };
      const found = items(await get("/entities", { "external.imdb.ids": runtime.imdb }));
      return found.some((item) => idOf(item) === guestIds[0]) ? works("resolves back to the same person") : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Tag search by keyword",
    call: "/v2/tags filter.query=",
    async run() {
      const found = items(await get("/v2/tags", { "filter.query": "cooking", take: 20 }));
      const first = found[0];
      if (first) runtime.topicTag = idOf(first);
      return found.length
        ? works(`${found.length} tags. Fields: ${keys(first)}. Types: ${tally(found.map((tag) => String(tag.type ?? tag.subtype)))}`)
        : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Tag search by type",
    call: "/v2/tags filter.tag.types=urn:tag:occupation",
    async run() {
      const found = items(await get("/v2/tags", { "filter.tag.types": "urn:tag:occupation", "filter.query": "comedian", take: 10 }));
      if (!runtime.occupationTag && found[0]) runtime.occupationTag = idOf(found[0]);
      return found.length ? works(`${found.length} occupation tags`) : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Tag types",
    call: "/v2/tags/types",
    async run() {
      const found = items(await get("/v2/tags/types", {}));
      return found.length ? works(`${found.length} items. Fields: ${keys(found[0])}`) : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Audiences",
    call: "/v2/audiences filter.parents.types=urn:audience:hobbies_and_interests",
    async run() {
      const found = items(await get("/v2/audiences", { "filter.parents.types": "urn:audience:hobbies_and_interests", take: 20 }));
      if (found[0]) runtime.audience = String(found[0].id);
      return found.length ? works(`${found.length} audiences. Fields: ${keys(found[0])}`) : empty();
    },
  },
  {
    group: "Lookup",
    feature: "Audience types",
    call: "/v2/audiences/types",
    async run() {
      const found = items(await get("/v2/audiences/types", {}));
      return found.length ? works(`${found.length} types`) : empty();
    },
  },
  ...["destination", "place", "video_game", "videogame", "locality"].map(
    (kind): Check => ({
      group: "Insights types",
      feature: `Show audience → ${kind}`,
      call: `/v2/insights filter.type=urn:entity:${kind}`,
      async run() {
        const found = items(await insights({ "filter.type": `urn:entity:${kind}`, "signal.interests.entities": show.entity_id, take: 10 }), "entities");
        return found.length ? works(`${found.length} results`) : empty();
      },
    }),
  ),
  {
    group: "Output types",
    feature: "Demographics, one input",
    call: "/v2/insights filter.type=urn:demographics",
    async run() {
      const blocks = items(await insights({ "filter.type": "urn:demographics", "signal.interests.entities": show.entity_id }), "demographics");
      const query = obj(blocks[0]?.query);
      return blocks.length ? works(`${blocks.length} block. Age keys: ${keys(query.age)}. Gender keys: ${keys(query.gender)}`) : empty();
    },
  },
  {
    group: "Output types",
    feature: "Demographics, show plus 4 guests in one call",
    call: "/v2/insights filter.type=urn:demographics, 5 entities",
    async run() {
      const blocks = items(
        await insights({ "filter.type": "urn:demographics", "signal.interests.entities": [show.entity_id, ...guestIds] }),
        "demographics",
      );
      const perInput = blocks.map(idOf).filter((id) => id === show.entity_id || guestIds.includes(id)).length;
      const ages = blocks.map((block) => obj(obj(block.query).age));
      const showAge = ages[0] ?? {};
      const gaps = ages.slice(1).map((age) =>
        Math.max(...Object.keys(showAge).map((bucket) => Math.abs(Number(age[bucket] ?? 0) - Number(showAge[bucket] ?? 0)))),
      );
      return blocks.length
        ? works(`${blocks.length} blocks, ${perInput} matched to inputs. Largest age-bucket gap from the show per guest: ${gaps.map((gap) => gap.toFixed(2)).join(", ")}`)
        : empty();
    },
  },
  {
    group: "Output types",
    feature: "Taste analysis for a podcast",
    call: "/v2/insights filter.type=urn:tag",
    async run() {
      const tags = items(await insights({ "filter.type": "urn:tag", "signal.interests.entities": show.entity_id, take: 30 }), "tags");
      return tags.length
        ? works(`${tags.length} tags. Subtypes: ${tally(tags.map((tag) => String(tag.subtype)))}. Query: ${keys(tags[0]?.query)}`)
        : empty();
    },
  },
  {
    group: "Output types",
    feature: "Taste analysis for a person",
    call: "/v2/insights filter.type=urn:tag, person signal",
    async run() {
      const tags = items(await insights({ "filter.type": "urn:tag", "signal.interests.entities": guest1, take: 30 }), "tags");
      return tags.length ? works(`${tags.length} tags. Subtypes: ${tally(tags.map((tag) => String(tag.subtype)))}`) : empty();
    },
  },
  {
    group: "Output types",
    feature: "Taste analysis narrowed to one tag type",
    call: "/v2/insights filter.type=urn:tag filter.tag.types=urn:tag:keyword:media",
    async run() {
      const tags = items(
        await insights({ "filter.type": "urn:tag", "signal.interests.entities": show.entity_id, "filter.tag.types": "urn:tag:keyword:media", take: 30 }),
        "tags",
      );
      return tags.length ? works(`${tags.length} tags. Subtypes: ${tally(tags.map((tag) => String(tag.subtype)))}`) : empty();
    },
  },
  {
    group: "Output types",
    feature: "Taste analysis diversified by subtype",
    call: "/v2/insights filter.type=urn:tag diversify.by=subtype diversify.take=3",
    async run() {
      const tags = items(
        await insights({ "filter.type": "urn:tag", "signal.interests.entities": show.entity_id, "diversify.by": "subtype", "diversify.take": 3, take: 30 }),
        "tags",
      );
      return tags.length ? works(`${tags.length} tags. Subtypes: ${tally(tags.map((tag) => String(tag.subtype)))}`) : empty();
    },
  },
  {
    group: "Output types",
    feature: "Heatmap for a show audience",
    call: "/v2/insights filter.type=urn:heatmap filter.location.query=New York",
    async run() {
      const data = await insights({ "filter.type": "urn:heatmap", "signal.interests.entities": show.entity_id, "filter.location.query": "New York" });
      const points = items(data, "heatmap");
      return points.length ? works(`${points.length} points. Query: ${keys(points[0]?.query)}`) : empty();
    },
  },
  {
    group: "Signals",
    feature: "Audience age as a signal (younger)",
    call: "signal.demographics.age=24_and_younger",
    run: () => personWith({ "signal.demographics.age": "24_and_younger" }),
  },
  {
    group: "Signals",
    feature: "Audience age as a signal (older)",
    call: "signal.demographics.age=55_and_older",
    run: () => personWith({ "signal.demographics.age": "55_and_older" }),
  },
  {
    group: "Signals",
    feature: "Audience gender as a signal",
    call: "signal.demographics.gender=female",
    run: () => personWith({ "signal.demographics.gender": "female" }),
  },
  {
    group: "Signals",
    feature: "Audience segment as a signal",
    call: "signal.demographics.audiences=<hobby audience>",
    async run() {
      if (!runtime.audience) return { result: "error", note: "no audience ID to test with" };
      return personWith({ "signal.demographics.audiences": runtime.audience });
    },
  },
  {
    group: "Signals",
    feature: "Topic tag as a signal",
    call: "signal.interests.tags=<cooking tag>",
    async run() {
      if (!runtime.topicTag) return { result: "error", note: "no tag ID to test with" };
      return personWith({ "signal.interests.tags": runtime.topicTag });
    },
  },
  {
    group: "Signals",
    feature: "Show plus two guests as the signal",
    call: "signal.interests.entities=show,guest,guest",
    run: () => personWith({ "signal.interests.entities": [show.entity_id, guest1, guest2] }),
  },
  {
    group: "Signals",
    feature: "Entity weight against an age signal",
    call: "signal.interests.entities.weight=very_low vs very_high, with signal.demographics.age",
    async run() {
      const params = { ...baselineParams, "signal.demographics.age": "24_and_younger" };
      const low = items(await insights({ ...params, "signal.interests.entities.weight": "very_low" }), "entities").map(idOf);
      const high = items(await insights({ ...params, "signal.interests.entities.weight": "very_high" }), "entities").map(idOf);
      const lowInBaseline = low.filter((id) => baselineIds.includes(id)).length;
      const highInBaseline = high.filter((id) => baselineIds.includes(id)).length;
      return low.length && high.length
        ? works(`one weight for all entities, not per entity. Baseline people kept: ${lowInBaseline}/50 at very_low, ${highInBaseline}/50 at very_high`)
        : empty();
    },
  },
  {
    group: "Signals",
    feature: "Audience weight",
    call: "signal.demographics.audiences.weight=very_high",
    async run() {
      if (!runtime.audience) return { result: "error", note: "no audience ID to test with" };
      return personWith({ "signal.demographics.audiences": runtime.audience, "signal.demographics.audiences.weight": "very_high" });
    },
  },
  {
    group: "Signals",
    feature: "Explainability with several signals",
    call: "feature.explainability=true, 3 entities",
    async run() {
      const found = items(
        await insights({ ...baselineParams, "signal.interests.entities": [show.entity_id, guest1, guest2], "feature.explainability": true, take: 10 }),
        "entities",
      );
      const spreads = found.map((entity) => {
        const parts = list(obj(obj(entity.query).explainability)["signal.interests.entities"]);
        const scores = parts.map((part) => Number(part.score ?? 0));
        return scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
      });
      const mean = spreads.reduce((a, b) => a + b, 0) / Math.max(spreads.length, 1);
      return found.length ? works(`explainability keys: ${keys(obj(found[0]?.query).explainability)}. Mean score spread across inputs: ${mean.toFixed(3)}`) : empty();
    },
  },
  {
    group: "Signals",
    feature: "Location as a signal for people",
    call: "signal.location.query=London",
    run: () => personWith({ "signal.location.query": "London" }),
  },
  {
    group: "Filters",
    feature: "Exclude entities",
    call: "filter.exclude.entities=<2 guests>",
    async run() {
      const found = items(await insights({ ...baselineParams, "filter.exclude.entities": [guest1, guest2] }), "entities");
      const leaked = found.map(idOf).filter((id) => id === guest1 || id === guest2).length;
      return found.length ? works(`${found.length} results, ${leaked} excluded people still present`) : empty();
    },
  },
  {
    group: "Filters",
    feature: "Score many entities at once",
    call: "filter.results.entities=<20 people>",
    async run() {
      const wanted = baselineIds.slice(10, 30);
      const found = items(await insights({ ...baselineParams, "filter.results.entities": wanted }), "entities");
      const matched = found.map(idOf).filter((id) => wanted.includes(id)).length;
      return found.length ? works(`${matched}/${wanted.length} returned with affinity`) : empty();
    },
  },
  {
    group: "Filters",
    feature: "Second page by offset",
    call: "offset=50",
    async run() {
      const found = items(await insights({ ...baselineParams, offset: 50 }), "entities");
      const repeats = found.map(idOf).filter((id) => baselineIds.includes(id)).length;
      return found.length ? works(`${found.length} more results, ${repeats} repeated from page one`) : empty();
    },
  },
  {
    group: "Filters",
    feature: "Second page by page",
    call: "page=2",
    async run() {
      const found = items(await insights({ ...baselineParams, page: 2 }), "entities");
      const repeats = found.map(idOf).filter((id) => baselineIds.includes(id)).length;
      return found.length ? works(`${found.length} more results, ${repeats} repeated from page one`) : empty();
    },
  },
  {
    group: "Filters",
    feature: "Occupation tag filter",
    call: "filter.tags=<occupation tag>",
    async run() {
      if (!runtime.occupationTag) return { result: "error", note: "no occupation tag to test with" };
      return personWith({ "filter.tags": runtime.occupationTag });
    },
  },
  {
    group: "Filters",
    feature: "Minimum popularity",
    call: "filter.popularity.min=0.9",
    async run() {
      const found = items(await insights({ ...baselineParams, "filter.popularity.min": 0.9 }), "entities");
      const below = found.filter((entity) => Number(entity.popularity ?? 0) < 0.9).length;
      return found.length ? works(`${found.length} results, ${below} below 0.9`) : empty();
    },
  },
  {
    group: "Filters",
    feature: "Only entities with an image",
    call: "filter.exists=properties.image",
    run: () => personWith({ "filter.exists": "properties.image" }),
  },
  {
    group: "Filters",
    feature: "Trend bias",
    call: "bias.trends=high",
    run: () => personWith({ "bias.trends": "high" }),
  },
  {
    group: "Analysis",
    feature: "Compare two podcasts",
    call: "/v2/analysis/compare podcast vs podcast",
    async run() {
      if (!neighbour) return { result: "error", note: "no neighbour podcast" };
      const data = await get("/v2/analysis/compare", { "a.signal.interests.entities": show.entity_id, "b.signal.interests.entities": neighbour.entity_id });
      const results = obj(data.results);
      return works(`shared ${list(results.tags).length}, show only ${list(results.a).length}, other only ${list(results.b).length}`);
    },
  },
  {
    group: "Analysis",
    feature: "Compare two people",
    call: "/v2/analysis/compare person vs person",
    async run() {
      const data = await get("/v2/analysis/compare", { "a.signal.interests.entities": guest1, "b.signal.interests.entities": guest2 });
      const results = obj(data.results);
      return works(`shared ${list(results.tags).length}, first only ${list(results.a).length}, second only ${list(results.b).length}`);
    },
  },
  {
    group: "Analysis",
    feature: "Compare, show vs guest, default",
    call: "/v2/analysis/compare",
    async run() {
      const data = await get("/v2/analysis/compare", { "a.signal.interests.entities": show.entity_id, "b.signal.interests.entities": guest1 });
      const results = obj(data.results);
      return works(`shared ${list(results.tags).length}, show only ${list(results.a).length}, guest only ${list(results.b).length}, match entities ${list(results.matchEntities).length}`);
    },
  },
  {
    group: "Analysis",
    feature: "Compare, predictive model",
    call: "/v2/analysis/compare model=predictive",
    async run() {
      const data = await get("/v2/analysis/compare", { "a.signal.interests.entities": show.entity_id, "b.signal.interests.entities": guest1, model: "predictive" });
      const results = obj(data.results);
      return works(`shared ${list(results.tags).length}, show only ${list(results.a).length}, guest only ${list(results.b).length}, match entities ${list(results.matchEntities).length}`);
    },
  },
  {
    group: "Analysis",
    feature: "Compare, genre tags only",
    call: "/v2/analysis/compare filter.subtype=urn:tag:genre",
    async run() {
      const data = await get("/v2/analysis/compare", { "a.signal.interests.entities": show.entity_id, "b.signal.interests.entities": guest1, "filter.subtype": "urn:tag:genre" });
      const results = obj(data.results);
      return works(`shared ${list(results.tags).length}, show only ${list(results.a).length}, guest only ${list(results.b).length}`);
    },
  },
  {
    group: "Analysis",
    feature: "Compare, artists only",
    call: "/v2/analysis/compare filter.type=urn:entity:artist",
    async run() {
      const data = await get("/v2/analysis/compare", { "a.signal.interests.entities": show.entity_id, "b.signal.interests.entities": guest1, "filter.type": "urn:entity:artist" });
      const results = obj(data.results);
      return works(`shared ${list(results.tags).length}, match entities ${list(results.matchEntities).length}, result keys: ${keys(results)}`);
    },
  },
  ...[
    { kind: PERSON, id: () => guest1, from: "2025-06-01", to: "2025-09-30" },
    { kind: PODCAST, id: () => show.entity_id, from: "2025-06-01", to: "2025-09-30" },
    { kind: PERSON, id: () => guest1, from: "2026-07-01", to: "2026-09-30" },
    { kind: PODCAST, id: () => show.entity_id, from: "2026-07-01", to: "2026-09-30" },
  ].map(
    ({ kind, id, from, to }): Check => ({
      group: "Trends",
      feature: `Trending, ${kind.split(":").pop()}, ${from} to ${to}`,
      call: "/v2/trending",
      async run() {
        const rows = items(await get("/v2/trending", { "filter.type": kind, "signal.interests.entities": id(), "filter.start_date": from, "filter.end_date": to }), "trending");
        const ranks = new Set(rows.map((row) => String(row.population_rank)));
        return rows.length ? works(`${rows.length} rows. Fields: ${keys(rows[0])}. Distinct ranks: ${ranks.size}`) : empty();
      },
    }),
  ),
];

const rows: string[] = [];
for (const check of checks) {
  let outcome: Outcome;
  try {
    outcome = await check.run();
  } catch (error) {
    if (!(error instanceof QlooError)) throw error;
    const detail = error.message.replace(/\s+/g, " ").slice(0, 160);
    outcome = { result: "error", note: detail };
  }
  rows.push(`| ${check.group} | ${check.feature} | \`${check.call}\` | ${outcome.result} | ${outcome.note.replaceAll("|", "/")} |`);
  console.log(`${outcome.result.padEnd(9)} ${check.feature}: ${outcome.note}`);
}

const body = [
  `# Qloo API map, ${new Date().toISOString()}`,
  "",
  `Show used as input: ${show.name}. Baseline: top 50 people for the show. Local only, never commit.`,
  "",
  "| Group | Feature | Call | Result | Note |",
  "| --- | --- | --- | --- | --- |",
  ...rows,
  "",
].join("\n");
const outDir = path.join(process.cwd(), ".cache", "map");
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `api-map-${Date.now()}.md`);
await writeFile(outFile, body);
const quota = qloo.quota();
console.log(`\nReport written to ${outFile}`);
console.log(`Qloo calls: ${quota.liveRequests} live, ${quota.cacheHits} from cache. Month quota left: ${quota.monthRemaining ?? "?"} of ${quota.monthLimit ?? "?"}.`);
