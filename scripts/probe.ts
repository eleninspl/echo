import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  candidateGuests,
  findShow,
  loveBack,
  podcastNeighbours,
  tagContrast,
} from "../src/lib/echo/signals";
import { mapLimit } from "../src/lib/map-limit";
import { fileCache } from "../src/lib/qloo/cache";
import { QlooError, createQlooClient } from "../src/lib/qloo/client";
import type { QlooEntity } from "../src/lib/qloo/types";

const DEFAULT_SHOWS = [
  "SmartLess",
  "Conan O'Brien Needs A Friend",
  "Song Exploder",
  "Broken Record",
  "New Heights",
  "The Bill Simmons Podcast",
];
const PER_VARIANT = 10;
const POPULARITY_CAP = 0.7;
const NEIGHBOURS = 50;
const CONCURRENCY = 3;
const COMPARE_SAMPLE = 5;

type Candidate = {
  name: string;
  popularity: number;
  fromCappedList: boolean;
  fit: number;
  loveBack?: number;
  loveBackRank?: number;
  reach: number;
  tagReach?: number;
  sharedTags: number;
};

type Scored = Candidate & { fitPct: number; lovePct: number; reachPct: number; echo: number };

type ShowReport = {
  query: string;
  matched: string;
  popularity: number;
  deceasedDropped: number;
  unusable: number;
  candidates: Scored[];
};

const apiKey = process.env.QLOO_API_KEY;
if (!apiKey) {
  console.error("QLOO_API_KEY is not set. Run: scripts/set-env.sh QLOO_API_KEY");
  process.exit(1);
}

const qloo = createQlooClient({ apiKey, baseUrl: process.env.QLOO_BASE_URL, cache: fileCache() });
const shows = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_SHOWS;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

const pearson = (xs: number[], ys: number[]) => {
  const n = xs.length;
  if (n < 3) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    cov += (xs[i]! - mx) * (ys[i]! - my);
    vx += (xs[i]! - mx) ** 2;
    vy += (ys[i]! - my) ** 2;
  }
  return vx && vy ? cov / Math.sqrt(vx * vy) : NaN;
};

const percentiles = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const denominator = Math.max(values.length - 1, 1);
  return values.map((value) => sorted.indexOf(value) / denominator);
};

const fmt = (value: number | undefined, digits = 3) =>
  value === undefined || Number.isNaN(value) ? "n/a" : value.toFixed(digits);

const range = (values: number[]) =>
  values.length ? `${fmt(Math.min(...values))} to ${fmt(Math.max(...values))}` : "n/a";

async function probeShow(query: string): Promise<ShowReport | undefined> {
  const show = await findShow(qloo, query);
  if (!show) {
    console.log(`\n${query}: not found in Qloo`);
    return undefined;
  }
  console.log(`\n${query} -> ${show.name} (popularity ${fmt(show.popularity)})`);

  const [open, capped, showNeighbours] = await Promise.all([
    candidateGuests(qloo, show.entity_id),
    candidateGuests(qloo, show.entity_id, { popularityMax: POPULARITY_CAP }),
    podcastNeighbours(qloo, show.entity_id, NEIGHBOURS),
  ]);

  const showCircle = new Set(
    showNeighbours.map((pod) => pod.entity_id).filter((id) => id !== show.entity_id),
  );
  const seen = new Set<string>();
  const picks: Array<{ person: QlooEntity; fromCappedList: boolean }> = [];
  for (const [list, fromCappedList] of [
    [open.alive, false],
    [capped.alive, true],
  ] as const) {
    for (const person of list.slice(0, PER_VARIANT)) {
      if (seen.has(person.entity_id)) continue;
      seen.add(person.entity_id);
      picks.push({ person, fromCappedList });
    }
  }

  const results = await mapLimit(picks, CONCURRENCY, async ({ person, fromCappedList }, index) => {
    let guestNeighbours: QlooEntity[];
    try {
      guestNeighbours = await podcastNeighbours(qloo, person.entity_id, NEIGHBOURS);
    } catch (error) {
      if (error instanceof QlooError && error.status === 400) return undefined;
      throw error;
    }
    const rank = guestNeighbours.findIndex((pod) => pod.entity_id === show.entity_id);
    const back =
      rank >= 0
        ? guestNeighbours[rank]!.query?.affinity
        : await loveBack(qloo, person.entity_id, show.entity_id);
    const contrast =
      index < COMPARE_SAMPLE ? await tagContrast(qloo, show.entity_id, person.entity_id) : undefined;
    const guestCircle = guestNeighbours.filter((pod) => pod.entity_id !== show.entity_id);
    const overlap = guestCircle.filter((pod) => showCircle.has(pod.entity_id)).length;
    const tagTotal = contrast ? contrast.shared.length + contrast.guestOnly.length : 0;
    return {
      name: person.name,
      popularity: person.popularity ?? 0,
      fromCappedList,
      fit: person.query?.affinity ?? 0,
      loveBack: back,
      loveBackRank: rank >= 0 ? rank + 1 : undefined,
      reach: guestCircle.length ? 1 - overlap / guestCircle.length : 0,
      tagReach: contrast && tagTotal ? contrast.guestOnly.length / tagTotal : undefined,
      sharedTags: contrast?.shared.length ?? 0,
    } satisfies Candidate;
  });
  const candidates = results.filter((candidate) => candidate !== undefined);

  const fitPct = percentiles(candidates.map((c) => c.fit));
  const lovePct = percentiles(candidates.map((c) => c.loveBack ?? 0));
  const reachPct = percentiles(candidates.map((c) => c.reach));
  const scored = candidates.map((c, i) => {
    const f = fitPct[i]!;
    const l = lovePct[i]!;
    const r = reachPct[i]!;
    return { ...c, fitPct: f, lovePct: l, reachPct: r, echo: Math.cbrt((f + 0.05) * (l + 0.05) * (r + 0.05)) };
  });

  return {
    query,
    matched: show.name,
    popularity: show.popularity ?? 0,
    deceasedDropped: new Set([...open.deceased, ...capped.deceased].map((p) => p.entity_id)).size,
    unusable: picks.length - candidates.length,
    candidates: scored,
  };
}

function summarise(report: ShowReport) {
  const c = report.candidates;
  const loves = c.flatMap((x) => (x.loveBack === undefined ? [] : [x.loveBack]));
  const tagReaches = c.flatMap((x) => (x.tagReach === undefined ? [] : [x.tagReach]));
  const withTagReach = c.filter((x) => x.tagReach !== undefined);
  const sweet = c.filter((x) => x.fitPct >= 0.5 && x.lovePct >= 0.5 && x.reachPct >= 0.5);
  const safe = c.filter((x) => x.fitPct >= 0.5 && x.reachPct < 0.5);
  const far = c.filter((x) => x.reachPct >= 0.5 && x.lovePct < 0.5);
  const byFit = [...c].sort((a, b) => b.fit - a.fit).slice(0, 5);
  const byEcho = [...c].sort((a, b) => b.echo - a.echo).slice(0, 5);
  const changed = byEcho.filter((x) => !byFit.includes(x)).length;

  const lines = [
    `## ${report.matched}`,
    "",
    `Searched "${report.query}", popularity ${fmt(report.popularity)}. ${c.length} candidates scored, ${report.deceasedDropped} deceased dropped, ${report.unusable} rejected by Qloo as an input.`,
    "",
    `- Fit (affinity) range: ${range(c.map((x) => x.fit))}`,
    `- Love back range: ${range(loves)} (${loves.length}/${c.length} returned)`,
    `- Reach (podcast circle) range: ${range(c.map((x) => x.reach))}, median ${fmt(median(c.map((x) => x.reach)))}`,
    `- Tag reach range: ${range(tagReaches)}`,
    `- Correlation popularity vs reach: ${fmt(pearson(c.map((x) => x.popularity), c.map((x) => x.reach)), 2)}`,
    `- Correlation fit vs reach: ${fmt(pearson(c.map((x) => x.fit), c.map((x) => x.reach)), 2)}`,
    `- Correlation fit vs love back: ${fmt(pearson(c.map((x) => x.fit), c.map((x) => x.loveBack ?? 0)), 2)}`,
    `- Correlation reach vs tag reach: ${fmt(pearson(withTagReach.map((x) => x.reach), withTagReach.map((x) => x.tagReach!)), 2)}`,
    `- Sweet spot ${sweet.length}, safe ${safe.length}, far ${far.length}`,
    `- Echo's top 5 that a fit-only ranking would not show: ${changed}/5`,
    "",
    "| Guest | Pop | Capped list | Fit | Love back | Show rank in guest's pods | Reach | Tag reach | Echo |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...[...c]
      .sort((a, b) => b.echo - a.echo)
      .map(
        (x) =>
          `| ${x.name} | ${fmt(x.popularity, 2)} | ${x.fromCappedList ? "yes" : ""} | ${fmt(x.fit)} | ${fmt(x.loveBack)} | ${x.loveBackRank ?? ">50"} | ${fmt(x.reach, 2)} | ${fmt(x.tagReach, 2)} | ${fmt(x.echo, 2)} |`,
      ),
    "",
  ];
  return lines.join("\n");
}

const reports: ShowReport[] = [];
for (const query of shows) {
  const report = await probeShow(query);
  if (report) reports.push(report);
}

const body = [
  `# Echo coverage probe, ${new Date().toISOString()}`,
  "",
  `Per show: top ${PER_VARIANT} people uncapped plus top ${PER_VARIANT} with popularity <= ${POPULARITY_CAP}, deceased removed. Reach = share of the guest audience's top ${NEIGHBOURS} podcasts that are not in the show audience's top ${NEIGHBOURS}. Percentiles are within each show.`,
  "",
  "Local only. Contains Qloo response data, never commit.",
  "",
  ...reports.map(summarise),
].join("\n");

const outDir = path.join(process.cwd(), ".cache", "probe");
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `probe-${Date.now()}.md`);
await writeFile(outFile, body);
const quota = qloo.quota();
console.log(`\n${body}\n\nReport written to ${outFile}`);
console.log(
  `Qloo calls: ${quota.liveRequests} live, ${quota.cacheHits} from cache. Month quota left: ${quota.monthRemaining ?? "?"} of ${quota.monthLimit ?? "?"}.`,
);
